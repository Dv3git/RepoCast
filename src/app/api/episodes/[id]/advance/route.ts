import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { advanceEpisode } from '@/lib/pipeline';

// Un paso del pipeline (analizar con Claude o grabar las voces) puede tardar un par de minutos.
export const maxDuration = 300;

export async function POST(_request: Request, ctx: RouteContext<'/api/episodes/[id]/advance'>) {
  const { id } = await ctx.params;
  try {
    return NextResponse.json(await advanceEpisode(id));
  } catch (err) {
    return apiError(err);
  }
}
