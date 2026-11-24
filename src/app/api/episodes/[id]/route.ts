import { NextResponse } from 'next/server';
import { getEpisodeById, toPublic } from '@/lib/episodes';
import { getCurrentUser } from '@/lib/supabase/server';

export async function GET(_request: Request, ctx: RouteContext<'/api/episodes/[id]'>) {
  const { id } = await ctx.params;
  const [episode, user] = await Promise.all([getEpisodeById(id), getCurrentUser()]);
  if (!episode) return NextResponse.json({ error: 'No existe ese podcast.' }, { status: 404 });
  return NextResponse.json(toPublic(episode, user?.id ?? null), { headers: { 'Cache-Control': 'no-store' } });
}
