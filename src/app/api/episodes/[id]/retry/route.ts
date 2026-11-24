import { NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api';
import { getEpisodeById } from '@/lib/episodes';
import { retryEpisode } from '@/lib/pipeline';
import { getCurrentUser } from '@/lib/supabase/server';

export async function POST(_request: Request, ctx: RouteContext<'/api/episodes/[id]/retry'>) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  try {
    const episode = await getEpisodeById(id);
    if (!episode || episode.user_id !== user.id) {
      return NextResponse.json({ error: 'Solo quien creó el podcast puede reintentarlo.' }, { status: 403 });
    }
    await retryEpisode(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
