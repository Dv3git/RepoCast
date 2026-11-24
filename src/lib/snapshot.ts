import 'server-only';
import { compare, getFileText, getTree } from '@/lib/github';
import { selectFiles } from '@/lib/select-files';
import { db } from '@/lib/supabase/server';
import type { CompareStats } from '@/lib/types';

const PER_FILE_CHARS = 30_000;
const MAX_TREE_LINES = 1500;
const PATCH_BUDGET = 160_000;

export interface SnapshotFile {
  path: string;
  content: string;
  truncated: boolean;
}

export interface OverviewSnapshot {
  kind: 'overview';
  owner: string;
  repo: string;
  sha: string;
  tree: string[];
  treeTruncated: boolean;
  files: SnapshotFile[];
}

export interface ChangesSnapshot {
  kind: 'changes';
  owner: string;
  repo: string;
  baseRef: string;
  headRef: string;
  baseSha: string;
  headSha: string;
  totalCommits: number;
  commits: { sha: string; message: string; author: string }[];
  files: { path: string; status: string; additions: number; deletions: number; patch?: string; patchTruncated?: boolean }[];
  stats: CompareStats;
}

export type Snapshot = OverviewSnapshot | ChangesSnapshot;

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

export async function buildOverviewSnapshot(owner: string, repo: string, sha: string): Promise<OverviewSnapshot> {
  const { entries, truncated } = await getTree(owner, repo, sha);
  if (entries.length === 0) throw new Error('El repositorio está vacío.');
  const { paths, tree } = selectFiles(entries);

  const contents = await mapLimit(paths, 8, async (path) => {
    const text = await getFileText(owner, repo, sha, path);
    if (text === null) return null;
    const cut = text.length > PER_FILE_CHARS;
    return { path, content: cut ? text.slice(0, PER_FILE_CHARS) : text, truncated: cut };
  });

  const files = contents.filter((f): f is SnapshotFile => f !== null);
  if (files.length === 0) throw new Error('No he encontrado ficheros de código que leer en este repositorio.');
  return { kind: 'overview', owner, repo, sha, tree, treeTruncated: truncated || tree.length > MAX_TREE_LINES, files };
}

export async function buildChangesSnapshot(
  owner: string,
  repo: string,
  baseRef: string,
  baseSha: string,
  headRef: string,
  headSha: string,
): Promise<ChangesSnapshot> {
  const c = await compare(owner, repo, baseSha, headSha);
  if (c.totalCommits === 0) throw new Error('No hay cambios entre esas dos versiones. ¿Están en el orden correcto (antigua → nueva)?');

  const stats: CompareStats = {
    commits: c.totalCommits,
    files: c.files.length,
    additions: c.files.reduce((s, f) => s + f.additions, 0),
    deletions: c.files.reduce((s, f) => s + f.deletions, 0),
  };

  // Los parches de los ficheros con más cambios primero, hasta el presupuesto.
  let budget = PATCH_BUDGET;
  const byImpact = [...c.files].sort((a, b) => b.additions + b.deletions - (a.additions + a.deletions));
  const keep = new Map<string, { patch?: string; patchTruncated?: boolean }>();
  for (const f of byImpact) {
    if (!f.patch || budget <= 0) {
      keep.set(f.path, { patchTruncated: Boolean(f.patch) });
      continue;
    }
    const cut = f.patch.length > Math.min(budget, 12_000);
    const patch = f.patch.slice(0, Math.min(budget, 12_000));
    budget -= patch.length;
    keep.set(f.path, { patch, patchTruncated: cut });
  }

  return {
    kind: 'changes',
    owner,
    repo,
    baseRef,
    headRef,
    baseSha,
    headSha,
    totalCommits: c.totalCommits,
    commits: c.commits.slice(-200),
    files: c.files.map((f) => ({ path: f.path, status: f.status, additions: f.additions, deletions: f.deletions, ...keep.get(f.path) })),
    stats,
  };
}

export function snapshotPath(s: Snapshot) {
  return s.kind === 'overview'
    ? `${s.owner}/${s.repo}/${s.sha}.json`
    : `${s.owner}/${s.repo}/changes-${s.baseSha}-${s.headSha}.json`;
}

export async function saveSnapshot(s: Snapshot): Promise<string> {
  const path = snapshotPath(s);
  const { error } = await db()
    .storage.from('snapshots')
    .upload(path, new Blob([JSON.stringify(s)], { type: 'application/json' }), { upsert: true, contentType: 'application/json' });
  if (error) throw new Error(`No pude guardar la copia del repositorio: ${error.message}`);
  return path;
}

const memo = new Map<string, Snapshot>();

export async function loadSnapshot(path: string): Promise<Snapshot> {
  const cached = memo.get(path);
  if (cached) return cached;
  const { data, error } = await db().storage.from('snapshots').download(path);
  if (error || !data) throw new Error('No encuentro la copia del repositorio.');
  const s = JSON.parse(await data.text()) as Snapshot;
  if (memo.size > 30) memo.clear();
  memo.set(path, s);
  return s;
}

function numbered(content: string) {
  return content
    .split('\n')
    .map((line, i) => `${i + 1}| ${line}`)
    .join('\n');
}

/** Texto que recibe Claude: estructura del repositorio y ficheros con números de línea. */
export function snapshotToPrompt(s: Snapshot): string {
  if (s.kind === 'overview') {
    const tree = s.tree.slice(0, MAX_TREE_LINES).join('\n');
    const files = s.files
      .map((f) => `<file path="${f.path}"${f.truncated ? ' truncated="true"' : ''}>\n${numbered(f.content)}\n</file>`)
      .join('\n\n');
    return [
      `<repository name="${s.owner}/${s.repo}" commit="${s.sha}">`,
      `<tree${s.treeTruncated ? ' truncated="true"' : ''}>\n${tree}\n</tree>`,
      `<files>\n${files}\n</files>`,
      '</repository>',
    ].join('\n');
  }

  const commits = s.commits.map((c) => `- ${c.sha.slice(0, 7)} ${c.message} (${c.author})`).join('\n');
  const files = s.files
    .map((f) => {
      const head = `<file path="${f.path}" status="${f.status}" additions="${f.additions}" deletions="${f.deletions}"${f.patchTruncated ? ' patch_truncated="true"' : ''}>`;
      return f.patch ? `${head}\n${f.patch}\n</file>` : `${head}</file>`;
    })
    .join('\n\n');
  return [
    `<changes repository="${s.owner}/${s.repo}" from="${s.baseRef}" to="${s.headRef}">`,
    `<stats commits="${s.stats.commits}" files="${s.stats.files}" additions="${s.stats.additions}" deletions="${s.stats.deletions}"/>`,
    `<commits>\n${commits}\n</commits>`,
    `<diff>\n${files}\n</diff>`,
    '</changes>',
  ].join('\n');
}

/** Rutas conocidas del snapshot (para validar lo que devuelve Claude). */
export function knownPaths(s: Snapshot): Set<string> {
  return new Set(s.kind === 'overview' ? s.tree : s.files.map((f) => f.path));
}
