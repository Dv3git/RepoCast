import { NextResponse } from 'next/server';
import { getEpisodeById } from '@/lib/episodes';
import { db } from '@/lib/supabase/server';

export async function POST(_request: Request, ctx: RouteContext<'/api/episodes/[id]/play'>) {
  const { id } = await ctx.params;
  const episode = await getEpisodeById(id);
  if (episode) await db().rpc('increment_plays', { episode_slug: episode.slug });
  return NextResponse.json({ ok: true });
}
