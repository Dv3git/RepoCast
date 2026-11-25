import 'server-only';
import { writeExtras } from '@/lib/claude';
import { loadSnapshot } from '@/lib/snapshot';
import { db } from '@/lib/supabase/server';
import type { Analysis, AnalysisExtras, Language } from '@/lib/types';

// El diagrama de flujo y el glosario se generan una sola vez por análisis y se guardan junto a él.
// Si dos peticiones llegan a la vez al mismo servidor, comparten la misma llamada a Claude.
const inflight = new Map<string, Promise<AnalysisExtras>>();

export async function getExtras(analysisId: string): Promise<AnalysisExtras | null> {
  const { data } = await db().from('analyses').select('extras').eq('id', analysisId).maybeSingle();
  return (data?.extras as AnalysisExtras | null | undefined) ?? null;
}

async function generate(analysisId: string): Promise<AnalysisExtras> {
  const { data: row, error } = await db()
    .from('analyses')
    .select('owner, repo, language, snapshot_path, data, extras, usage')
    .eq('id', analysisId)
    .single();
  if (error || !row) throw new Error('No encuentro el análisis.');
  if (row.extras) return row.extras as AnalysisExtras;

  const snapshot = await loadSnapshot(row.snapshot_path);
  const { extras, usage } = await writeExtras(snapshot, row.data as Analysis, `${row.owner}/${row.repo}`, row.language as Language);
  const { error: saveError } = await db()
    .from('analyses')
    .update({ extras, usage: { ...(row.usage as Record<string, unknown>), extras: usage } })
    .eq('id', analysisId);
  if (saveError) throw new Error(`No pude guardar los extras: ${saveError.message}`);
  return extras;
}

/** Devuelve los extras del análisis, generándolos con Claude si todavía no existen. */
export function ensureExtras(analysisId: string): Promise<AnalysisExtras> {
  let job = inflight.get(analysisId);
  if (!job) {
    job = generate(analysisId).finally(() => inflight.delete(analysisId));
    inflight.set(analysisId, job);
  }
  return job;
}
