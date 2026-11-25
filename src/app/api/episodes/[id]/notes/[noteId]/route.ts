import { NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api';
import { deleteNote } from '@/lib/notes';
import { getCurrentUser } from '@/lib/supabase/server';

export async function DELETE(_request: Request, ctx: RouteContext<'/api/episodes/[id]/notes/[noteId]'>) {
  const { noteId } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (!/^[0-9a-f-]{36}$/i.test(noteId)) return NextResponse.json({ error: 'Nota no válida.' }, { status: 400 });
  try {
    const deleted = await deleteNote(user.id, noteId);
    return deleted ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: 'No existe esa nota.' }, { status: 404 });
  } catch (err) {
    return apiError(err);
  }
}
