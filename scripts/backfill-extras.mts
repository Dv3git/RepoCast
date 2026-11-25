// Añade capítulos, diagrama de flujo y glosario a los episodios que se generaron antes de existir.
// Uso: npm run backfill
const { writeChapters } = await import('../src/lib/claude');
const { ensureExtras } = await import('../src/lib/extras');
const { db } = await import('../src/lib/supabase/server');
import type { Language, ScriptTurn } from '../src/lib/types';

const { data: episodes, error } = await db()
  .from('episodes')
  .select('id, slug, language, script, chapters, analysis_id, usage')
  .eq('status', 'ready');
if (error) throw error;

let chapters = 0;
for (const e of episodes ?? []) {
  if (e.chapters || !e.script) continue;
  const res = await writeChapters(e.script as ScriptTurn[], e.language as Language);
  await db()
    .from('episodes')
    .update({ chapters: res.chapters, usage: { ...(e.usage as Record<string, unknown>), chapters: res.usage } })
    .eq('id', e.id);
  chapters++;
  console.log(`📑 ${e.slug}: ${res.chapters.map((c) => c.title).join(' · ')}`);
}

const analysisIds = [...new Set((episodes ?? []).map((e) => e.analysis_id).filter((id): id is string => Boolean(id)))];
const { data: missing } = await db().from('analyses').select('id, owner, repo').in('id', analysisIds).is('extras', null);
for (const a of missing ?? []) {
  const extras = await ensureExtras(a.id);
  console.log(`🔀 ${a.owner}/${a.repo}: ${extras.flow ? `${extras.flow.steps.length} pasos` : 'sin diagrama'}, ${extras.glossary.length} términos`);
}
console.log(`Listo: ${chapters} episodios con capítulos nuevos y ${missing?.length ?? 0} análisis con extras nuevos.`);
