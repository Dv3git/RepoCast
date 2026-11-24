import 'server-only';
import { env } from '@/lib/env';
import type { RepoMeta } from '@/lib/types';
import { parseRepoInput } from '@/lib/repo-url';

export { parseRepoInput };

export class GitHubError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const API = 'https://api.github.com';

function headers(accept = 'application/vnd.github+json'): HeadersInit {
  const h: Record<string, string> = {
    Accept: accept,
    'User-Agent': 'RepoCast',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (env.githubToken) h.Authorization = `Bearer ${env.githubToken}`;
  return h;
}

async function gh<T>(path: string, accept?: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: headers(accept), cache: 'no-store' });
  if (res.status === 404) throw new GitHubError('No encuentro ese repositorio o esa versión. ¿Es público?', 404);
  if (res.status === 403 || res.status === 429) {
    throw new GitHubError('GitHub nos ha limitado temporalmente. Prueba en unos minutos.', res.status);
  }
  if (!res.ok) throw new GitHubError(`GitHub respondió ${res.status}.`, res.status);
  if (accept === 'application/vnd.github.sha') return (await res.text()) as T;
  return res.json() as Promise<T>;
}

interface RawRepo {
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  owner: { avatar_url: string };
  default_branch: string;
  html_url: string;
  private: boolean;
  size: number;
}

export async function getRepoMeta(owner: string, repo: string): Promise<RepoMeta> {
  const r = await gh<RawRepo>(`/repos/${owner}/${repo}`);
  if (r.private) throw new GitHubError('Solo se pueden analizar repositorios públicos.', 403);
  return {
    fullName: r.full_name,
    description: r.description,
    stars: r.stargazers_count,
    language: r.language,
    avatarUrl: r.owner.avatar_url,
    defaultBranch: r.default_branch,
    htmlUrl: r.html_url,
  };
}

/** Convierte una rama, tag o commit en el SHA exacto del commit. */
export async function resolveSha(owner: string, repo: string, ref: string): Promise<string> {
  const sha = await gh<string>(`/repos/${owner}/${repo}/commits/${encodeURIComponent(ref)}`, 'application/vnd.github.sha');
  return sha.trim();
}

export interface TreeEntry {
  path: string;
  size: number;
}

export async function getTree(owner: string, repo: string, sha: string): Promise<{ entries: TreeEntry[]; truncated: boolean }> {
  const t = await gh<{ tree: { path: string; type: string; size?: number }[]; truncated: boolean }>(
    `/repos/${owner}/${repo}/git/trees/${sha}?recursive=1`,
  );
  return {
    entries: t.tree.filter((e) => e.type === 'blob').map((e) => ({ path: e.path, size: e.size ?? 0 })),
    truncated: t.truncated,
  };
}

const MAX_FILE_BYTES = 200_000;

/** Descarga un fichero de texto. Devuelve null si es binario o demasiado grande. */
export async function getFileText(owner: string, repo: string, sha: string, path: string): Promise<string | null> {
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${path.split('/').map(encodeURIComponent).join('/')}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'RepoCast' }, cache: 'no-store' });
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > MAX_FILE_BYTES || buf.includes(0)) return null;
  return buf.toString('utf8');
}

export interface RefsList {
  defaultBranch: string;
  tags: string[];
  branches: string[];
}

export async function listRefs(owner: string, repo: string): Promise<RefsList> {
  const [meta, tags, branches] = await Promise.all([
    getRepoMeta(owner, repo),
    gh<{ name: string }[]>(`/repos/${owner}/${repo}/tags?per_page=40`),
    gh<{ name: string }[]>(`/repos/${owner}/${repo}/branches?per_page=40`),
  ]);
  return {
    defaultBranch: meta.defaultBranch,
    tags: tags.map((t) => t.name),
    branches: branches.map((b) => b.name),
  };
}

export interface CompareResult {
  commits: { sha: string; message: string; author: string }[];
  files: { path: string; status: string; additions: number; deletions: number; patch?: string }[];
  totalCommits: number;
}

export async function compare(owner: string, repo: string, base: string, head: string): Promise<CompareResult> {
  const c = await gh<{
    total_commits: number;
    commits: { sha: string; commit: { message: string; author: { name: string } | null } }[];
    files?: { filename: string; status: string; additions: number; deletions: number; patch?: string }[];
  }>(`/repos/${owner}/${repo}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}?per_page=250`);
  return {
    totalCommits: c.total_commits,
    commits: c.commits.map((x) => ({
      sha: x.sha,
      message: x.commit.message.split('\n')[0].slice(0, 200),
      author: x.commit.author?.name ?? 'desconocido',
    })),
    files: (c.files ?? []).map((f) => ({
      path: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
      patch: f.patch,
    })),
  };
}
