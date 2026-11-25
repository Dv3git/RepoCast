import 'server-only';
import { getRepoMeta, parseRepoInput, resolveSha } from '@/lib/github';
import { assertQuota, recordUsage } from '@/lib/quota';
import { db } from '@/lib/supabase/server';
import type { Analysis, AnalysisExtras, Duration, Episode, Kind, Language, PublicEpisode, Style } from '@/lib/types';
import { DURATIONS, LANGUAGES, STYLES } from '@/lib/types';

const PUBLIC_COLUMNS =
  'id, slug, user_id, kind, owner, repo, ref, sha, base_ref, base_sha, language, duration, style, status, status_detail, error, attempts, repo_meta, compare_stats, analysis_id, title, tagline, script, audio_path, audio_seconds, waveform, chapters, featured, plays, created_at, updated_at';

export function audioUrl(path: string | null) {
  if (!path) return null;
  return db().storage.from('podcasts').getPublicUrl(path).data.publicUrl;
}

export function toPublic(e: Episode, viewerId: string | null = null): PublicEpisode {
  return {
    id: e.id,
    slug: e.slug,
    kind: e.kind,
    owner: e.owner,
    repo: e.repo,
    ref: e.ref,
    sha: e.sha,
    baseRef: e.base_ref,
    language: e.language,
    duration: e.duration,
    style: e.style,
    status: e.status,
    statusDetail: e.status_detail,
    error: e.error,
    repoMeta: e.repo_meta,
    compareStats: e.compare_stats,
    title: e.title,
    tagline: e.tagline,
    script: e.script,
    audioUrl: audioUrl(e.audio_path),
    audioSeconds: e.audio_seconds,
    waveform: e.waveform,
    chapters: e.chapters ?? null,
    createdAt: e.created_at,
    isOwner: viewerId !== null && viewerId === e.user_id,
  };
}

export async function getEpisodeBySlug(slug: string): Promise<Episode | null> {
  const { data } = await db().from('episodes').select(PUBLIC_COLUMNS).eq('slug', slug).maybeSingle();
  return (data as Episode | null) ?? null;
}

export async function getEpisodeById(id: string): Promise<Episode | null> {
  const { data } = await db().from('episodes').select(PUBLIC_COLUMNS).eq('id', id).maybeSingle();
  return (data as Episode | null) ?? null;
}

export interface EpisodeInternals {
  snapshotPath: string | null;
  analysisId: string | null;
  analysis: Analysis | null;
  /** Diagrama de flujo y glosario, si ya se generaron. */
  extras: AnalysisExtras | null;
}

/** Análisis, extras y ruta del snapshot de un episodio (solo servidor). */
export async function getEpisodeInternals(id: string): Promise<EpisodeInternals> {
  const { data } = await db().from('episodes').select('snapshot_path, analysis_id').eq('id', id).maybeSingle();
  if (!data) return { snapshotPath: null, analysisId: null, analysis: null, extras: null };
  let analysis: Analysis | null = null;
  let extras: AnalysisExtras | null = null;
  if (data.analysis_id) {
    const { data: a } = await db().from('analyses').select('data, extras').eq('id', data.analysis_id).maybeSingle();
    analysis = (a?.data as Analysis | undefined) ?? null;
    extras = (a?.extras as AnalysisExtras | null | undefined) ?? null;
  }
  return { snapshotPath: (data.snapshot_path as string | null) ?? null, analysisId: data.analysis_id, analysis, extras };
}

export async function listReadyEpisodes(limit = 12): Promise<Episode[]> {
  const { data } = await db()
    .from('episodes')
    .select(PUBLIC_COLUMNS)
    .eq('status', 'ready')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data as Episode[] | null) ?? [];
}

export async function listUserEpisodes(userId: string): Promise<Episode[]> {
  const { data } = await db()
    .from('episodes')
    .select(PUBLIC_COLUMNS)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(100);
  return (data as Episode[] | null) ?? [];
}

export class InputError extends Error {}

export interface CreateInput {
  kind: Kind;
  repoUrl: string;
  ref?: string;
  baseRef?: string;
  language: Language;
  duration: Duration;
  style: Style;
}

function slugFor(repo: string) {
  const clean = repo.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'repo';
  return `${clean}-${crypto.randomUUID().slice(0, 6)}`;
}

/**
 * Crea un episodio (o devuelve uno idéntico que ya exista para el mismo commit y ajustes,
 * sin gastar cupo). El trabajo pesado lo hace después el pipeline paso a paso.
 */
export async function createEpisode(input: CreateInput, userId: string): Promise<{ slug: string; reused: boolean }> {
  if (!(input.language in LANGUAGES) || !(input.duration in DURATIONS) || !(input.style in STYLES)) {
    throw new InputError('Opciones del podcast no válidas.');
  }
  const parsed = parseRepoInput(input.repoUrl);
  if (!parsed) throw new InputError('Pega la URL de un repositorio de GitHub, por ejemplo https://github.com/vercel/swr');

  const meta = await getRepoMeta(parsed.owner, parsed.repo);
  const [owner, repo] = meta.fullName.split('/');
  const ref = (input.ref || parsed.ref || meta.defaultBranch).trim();
  const sha = await resolveSha(owner, repo, ref);

  let baseRef: string | null = null;
  let baseSha = '';
  if (input.kind === 'changes') {
    baseRef = (input.baseRef ?? '').trim();
    if (!baseRef) throw new InputError('Elige la versión antigua con la que comparar.');
    baseSha = await resolveSha(owner, repo, baseRef);
    if (baseSha === sha) throw new InputError('Las dos versiones apuntan al mismo commit: no hay cambios que contar.');
  }

  // ¿Ya existe este mismo podcast (o se está generando)? Se reutiliza.
  const { data: existing } = await db()
    .from('episodes')
    .select('slug')
    .match({ kind: input.kind, owner, repo, sha, base_sha: baseSha, language: input.language, duration: input.duration, style: input.style })
    .neq('status', 'failed')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return { slug: existing.slug as string, reused: true };

  await assertQuota(userId, 'episode');

  const slug = slugFor(repo);
  const { error } = await db().from('episodes').insert({
    slug,
    user_id: userId,
    kind: input.kind,
    owner,
    repo,
    ref,
    sha,
    base_ref: baseRef,
    base_sha: baseSha,
    language: input.language,
    duration: input.duration,
    style: input.style,
    repo_meta: meta,
    status: 'queued',
  });
  if (error) throw new Error(`No pude crear el podcast: ${error.message}`);
  await recordUsage(userId, 'episode');
  return { slug, reused: false };
}
