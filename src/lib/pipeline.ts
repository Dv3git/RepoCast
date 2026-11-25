import 'server-only';
import { analyzeChanges, analyzeOverview, ClaudeRefusal, writeChapters, writeScript } from '@/lib/claude';
import { ensureExtras } from '@/lib/extras';
import { GitHubError } from '@/lib/github';
import { buildChangesSnapshot, buildOverviewSnapshot, loadSnapshot, saveSnapshot } from '@/lib/snapshot';
import { db } from '@/lib/supabase/server';
import { TtsQuotaError, voiceScript } from '@/lib/tts';
import type { Database } from '@/lib/database.types';
import type { Analysis, CompareStats, EpisodeStatus, Kind, Language, RepoMeta, ScriptTurn } from '@/lib/types';

// Cada llamada a advanceEpisode ejecuta UN paso y termina. El navegador va pidiendo
// el siguiente mientras muestra el progreso. Así cada paso cabe holgado en el límite
// de tiempo de una función serverless, y si algo falla se reintenta solo ese paso.

interface Row {
  id: string;
  slug: string;
  kind: Kind;
  owner: string;
  repo: string;
  ref: string;
  sha: string;
  base_ref: string | null;
  base_sha: string;
  language: Language;
  duration: 'short' | 'normal' | 'long';
  style: 'divulgativo' | 'tecnico' | 'humor';
  status: EpisodeStatus;
  attempts: number;
  snapshot_path: string | null;
  repo_meta: RepoMeta;
  analysis_id: string | null;
  script: ScriptTurn[] | null;
  usage: Record<string, unknown>;
}

const LOCK_MS = 290_000;
const MAX_ATTEMPTS = 3;

async function update(id: string, patch: Database['public']['Tables']['episodes']['Update']) {
  const { error } = await db().from('episodes').update(patch).eq('id', id);
  if (error) throw new Error(`No pude guardar el progreso: ${error.message}`);
}

async function stepIngest(e: Row) {
  // ¿Alguien analizó ya este commit en este idioma? Entonces nos saltamos a Claude.
  const { data: previous } = await db()
    .from('analyses')
    .select('id, snapshot_path, data')
    .match({ kind: e.kind, owner: e.owner, repo: e.repo, sha: e.sha, base_sha: e.base_sha, language: e.language })
    .maybeSingle();

  if (previous) {
    const analysis = previous.data as Analysis;
    let compareStats: CompareStats | null = null;
    if (e.kind === 'changes') {
      const snap = await loadSnapshot(previous.snapshot_path as string);
      if (snap.kind === 'changes') compareStats = snap.stats;
    }
    await update(e.id, {
      status: 'scripting',
      status_detail: 'Análisis reutilizado de otro episodio',
      snapshot_path: previous.snapshot_path,
      analysis_id: previous.id,
      title: analysis.title,
      tagline: analysis.tagline,
      compare_stats: compareStats,
      attempts: 0,
    });
    return;
  }

  await update(e.id, { status: 'ingesting', status_detail: 'Descargando los ficheros del repositorio' });
  const snapshot =
    e.kind === 'overview'
      ? await buildOverviewSnapshot(e.owner, e.repo, e.sha)
      : await buildChangesSnapshot(e.owner, e.repo, e.base_ref ?? e.base_sha, e.base_sha, e.ref, e.sha);
  const path = await saveSnapshot(snapshot);
  await update(e.id, {
    status: 'analyzing',
    status_detail:
      snapshot.kind === 'overview'
        ? `${snapshot.files.length} ficheros leídos de ${snapshot.tree.length}`
        : `${snapshot.stats.commits} commits y ${snapshot.stats.files} ficheros cambiados`,
    snapshot_path: path,
    compare_stats: snapshot.kind === 'changes' ? snapshot.stats : null,
    attempts: 0,
  });
}

async function stepAnalyze(e: Row) {
  if (!e.snapshot_path) throw new Error('Falta la copia del repositorio.');
  const snapshot = await loadSnapshot(e.snapshot_path);
  const { analysis, usage } =
    e.kind === 'overview'
      ? await analyzeOverview(snapshot, e.repo_meta, e.language)
      : await analyzeChanges(snapshot, e.repo_meta, e.language);

  const key = { kind: e.kind, owner: e.owner, repo: e.repo, sha: e.sha, base_sha: e.base_sha, language: e.language };
  const { data: inserted, error } = await db()
    .from('analyses')
    .upsert({ ...key, snapshot_path: e.snapshot_path, data: analysis, usage }, { onConflict: 'kind,owner,repo,sha,base_sha,language', ignoreDuplicates: true })
    .select('id')
    .maybeSingle();
  if (error) throw new Error(`No pude guardar el análisis: ${error.message}`);
  const analysisId = inserted?.id ?? (await db().from('analyses').select('id').match(key).single()).data?.id;

  await update(e.id, {
    status: 'scripting',
    status_detail: analysis.kind === 'overview' ? `${analysis.modules.length} módulos y ${analysis.tour.length} paradas en la visita` : `${analysis.changes.length} novedades destacadas`,
    analysis_id: analysisId,
    title: analysis.title,
    tagline: analysis.tagline,
    usage: { ...e.usage, analysis: usage },
    attempts: 0,
  });
}

async function stepScript(e: Row) {
  if (!e.analysis_id) throw new Error('Falta el análisis.');
  const { data } = await db().from('analyses').select('data').eq('id', e.analysis_id).single();
  if (!data) throw new Error('Falta el análisis.');
  const analysisId = e.analysis_id;
  // Mientras se escribe el guion, se preparan el diagrama de flujo y el glosario del análisis.
  // Son opcionales: si fallan, se generarán la primera vez que alguien los pida.
  const [{ turns, usage }] = await Promise.all([
    writeScript({
      analysis: data.data as Analysis,
      meta: e.repo_meta,
      language: e.language,
      duration: e.duration,
      style: e.style,
      rangeLabel: e.kind === 'changes' ? `from ${e.base_ref} to ${e.ref}` : undefined,
    }),
    ensureExtras(analysisId).catch((err) => console.error(`[pipeline] extras de ${e.slug}:`, err)),
  ]);
  const chapters = await writeChapters(turns, e.language).catch((err) => {
    console.error(`[pipeline] capítulos de ${e.slug}:`, err);
    return null;
  });
  await update(e.id, {
    status: 'voicing',
    status_detail: `Guion de ${turns.length} intervenciones${chapters?.chapters.length ? ` en ${chapters.chapters.length} capítulos` : ''}`,
    script: turns,
    chapters: chapters?.chapters.length ? chapters.chapters : null,
    usage: { ...e.usage, script: usage, ...(chapters ? { chapters: chapters.usage } : {}) },
    attempts: 0,
  });
}

async function stepVoice(e: Row) {
  if (!e.script) throw new Error('Falta el guion.');
  const voiced = await voiceScript(e.script, e.language, e.style);
  // Nombre único por generación: el MP3 se cachea un año en el CDN y, si se regenerara
  // con el mismo nombre, se oiría el audio antiguo con los tiempos del guion nuevo.
  const path = `${e.slug}-${Date.now().toString(36)}.mp3`;
  const { error } = await db()
    .storage.from('podcasts')
    .upload(path, new Blob([voiced.mp3 as BlobPart], { type: 'audio/mpeg' }), { upsert: true, contentType: 'audio/mpeg', cacheControl: '31536000' });
  if (error) throw new Error(`No pude guardar el audio: ${error.message}`);
  await update(e.id, {
    status: 'ready',
    status_detail: null,
    error: null,
    script: voiced.turns,
    audio_path: path,
    audio_seconds: voiced.seconds,
    waveform: voiced.waveform,
    usage: { ...e.usage, tts: { models: voiced.models, seconds: voiced.seconds } },
    attempts: 0,
  });
}

/** Errores que no se arreglan reintentando. */
function isPermanent(err: unknown) {
  return (
    (err instanceof GitHubError && err.status === 404) ||
    err instanceof ClaudeRefusal ||
    err instanceof TtsQuotaError ||
    (err instanceof Error && /vacío|No hay cambios|repositorios públicos/.test(err.message))
  );
}

export async function advanceEpisode(id: string): Promise<{ status: EpisodeStatus }> {
  const now = new Date();
  const { data: row } = await db()
    .from('episodes')
    .update({ locked_until: new Date(now.getTime() + LOCK_MS).toISOString() })
    .eq('id', id)
    .not('status', 'in', '(ready,failed)')
    .or(`locked_until.is.null,locked_until.lt.${now.toISOString()}`)
    .select('id, slug, kind, owner, repo, ref, sha, base_ref, base_sha, language, duration, style, status, attempts, snapshot_path, repo_meta, analysis_id, script, usage')
    .maybeSingle();

  // Otro proceso está con este episodio, o ya terminó: no hacemos nada.
  if (!row) {
    const { data } = await db().from('episodes').select('status').eq('id', id).maybeSingle();
    return { status: (data?.status as EpisodeStatus) ?? 'failed' };
  }

  const e = row as Row;
  try {
    if (e.status === 'queued' || e.status === 'ingesting') await stepIngest(e);
    else if (e.status === 'analyzing') await stepAnalyze(e);
    else if (e.status === 'scripting') await stepScript(e);
    else if (e.status === 'voicing') await stepVoice(e);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido';
    console.error(`[pipeline] ${e.slug} (${e.status}):`, err);
    const attempts = e.attempts + 1;
    if (isPermanent(err) || attempts >= MAX_ATTEMPTS) {
      await update(e.id, { status: 'failed', error: message, attempts, locked_until: null });
      return { status: 'failed' };
    }
    await update(e.id, { status_detail: `Reintentando (${attempts}/${MAX_ATTEMPTS - 1}): ${message}`, attempts, locked_until: null });
    return { status: e.status };
  }

  const { data } = await db().from('episodes').update({ locked_until: null }).eq('id', id).select('status').single();
  return { status: data?.status as EpisodeStatus };
}

/** Vuelve a poner en marcha un episodio fallido desde el último paso completado. */
export async function retryEpisode(id: string) {
  const { data } = await db().from('episodes').select('status, analysis_id, script, snapshot_path').eq('id', id).single();
  if (!data || data.status !== 'failed') return;
  const status: EpisodeStatus = data.script ? 'voicing' : data.analysis_id ? 'scripting' : data.snapshot_path ? 'analyzing' : 'queued';
  await update(id, { status, error: null, attempts: 0, status_detail: 'Reintentando', locked_until: null });
}
