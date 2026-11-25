import 'server-only';
import { getEpisodeById, getEpisodeInternals, toPublic } from '@/lib/episodes';
import { ensureExtras } from '@/lib/extras';
import type { GuideExcerpt } from '@/lib/guide';
import { listNotes } from '@/lib/notes';
import { languageFor } from '@/lib/select-files';
import { loadSnapshot, type Snapshot } from '@/lib/snapshot';
import type { Analysis, AnalysisExtras, Note, PublicEpisode } from '@/lib/types';

const MAX_EXCERPT_LINES = 40;

export interface GuideData {
  episode: PublicEpisode;
  analysis: Analysis;
  extras: AnalysisExtras | null;
  notes: Note[];
  excerpts: (GuideExcerpt | null)[];
}

/** Trozo de código de cada parada de la visita guiada, para la guía impresa. */
function tourExcerpts(snapshot: Snapshot, analysis: Analysis): (GuideExcerpt | null)[] {
  return analysis.tour.map((step) => {
    if (snapshot.kind === 'overview') {
      const file = snapshot.files.find((f) => f.path === step.file);
      if (!file || !step.startLine) return null;
      const lines = file.content.split('\n');
      const from = step.startLine;
      const to = Math.min(step.endLine ?? from, from + MAX_EXCERPT_LINES - 1, lines.length);
      return { code: lines.slice(from - 1, to).join('\n'), lang: languageFor(step.file), firstLine: from };
    }
    const file = snapshot.files.find((f) => f.path === step.file);
    if (!file?.patch) return null;
    const lines = file.patch.split('\n');
    const code = lines.slice(0, MAX_EXCERPT_LINES).join('\n') + (lines.length > MAX_EXCERPT_LINES ? '\n…' : '');
    return { code, lang: 'diff', firstLine: 0 };
  });
}

/** Todo lo que necesita la guía escrita de un episodio. Devuelve null si aún no está lista. */
export async function getGuideData(episodeId: string, userId: string | null): Promise<GuideData | null> {
  const [episode, internals] = await Promise.all([getEpisodeById(episodeId), getEpisodeInternals(episodeId)]);
  if (!episode || episode.status !== 'ready' || !internals.analysis || !internals.analysisId || !internals.snapshotPath) return null;
  const { analysis, analysisId, snapshotPath } = internals;
  const [extras, notes, snapshot] = await Promise.all([
    internals.extras ? Promise.resolve(internals.extras) : ensureExtras(analysisId).catch(() => null),
    userId ? listNotes(userId, episodeId) : Promise.resolve([]),
    loadSnapshot(snapshotPath),
  ]);
  return { episode: toPublic(episode, userId), analysis, extras, notes, excerpts: tourExcerpts(snapshot, analysis) };
}
