import { NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { apiError, unauthorized } from '@/lib/api';
import { getEpisodeById, InputError } from '@/lib/episodes';
import { addNote, listNotes, MAX_NOTE_LENGTH } from '@/lib/notes';
import { getCurrentUser } from '@/lib/supabase/server';

const Body = z.object({ seconds: z.number().min(0).max(24 * 3600), text: z.string().max(MAX_NOTE_LENGTH) });

// Notas privadas del usuario en este episodio.
export async function GET(_request: Request, ctx: RouteContext<'/api/episodes/[id]/notes'>) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  try {
    return NextResponse.json({ notes: await listNotes(user.id, id) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(request: Request, ctx: RouteContext<'/api/episodes/[id]/notes'>) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  try {
    const parsed = Body.safeParse(await request.json());
    if (!parsed.success) throw new InputError('Nota no válida.');
    const episode = await getEpisodeById(id);
    if (!episode || episode.status !== 'ready') return NextResponse.json({ error: 'No existe ese podcast.' }, { status: 404 });
    const seconds = Math.min(parsed.data.seconds, episode.audio_seconds ?? parsed.data.seconds);
    const note = await addNote(user.id, id, Math.round(seconds * 10) / 10, parsed.data.text.trim());
    return NextResponse.json({ note }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
