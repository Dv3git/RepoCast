import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { getEpisodeById, getEpisodeInternals } from '@/lib/episodes';
import { ensureExtras } from '@/lib/extras';

export const maxDuration = 120;

// Diagrama de flujo y glosario del episodio. Si aún no existen, se generan una vez
// (unos segundos) y quedan guardados para todos los episodios del mismo análisis.
export async function GET(_request: Request, ctx: RouteContext<'/api/episodes/[id]/extras'>) {
  const { id } = await ctx.params;
  try {
    const [episode, internals] = await Promise.all([getEpisodeById(id), getEpisodeInternals(id)]);
    if (!episode || !internals.analysisId) return NextResponse.json({ error: 'No disponible todavía.' }, { status: 404 });
    const extras = internals.extras ?? (await ensureExtras(internals.analysisId));
    return NextResponse.json({ extras }, { headers: { 'Cache-Control': 'public, max-age=300' } });
  } catch (err) {
    return apiError(err);
  }
}
