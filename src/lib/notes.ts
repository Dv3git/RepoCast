import 'server-only';
import { InputError } from '@/lib/episodes';
import { db } from '@/lib/supabase/server';
import type { Note } from '@/lib/types';

export const MAX_NOTES_PER_EPISODE = 200;
export const MAX_NOTE_LENGTH = 1000;

function toNote(row: { id: string; seconds: number; text: string; created_at: string }): Note {
  return { id: row.id, seconds: row.seconds, text: row.text, createdAt: row.created_at };
}

export async function listNotes(userId: string, episodeId: string): Promise<Note[]> {
  const { data, error } = await db()
    .from('notes')
    .select('id, seconds, text, created_at')
    .match({ user_id: userId, episode_id: episodeId })
    .order('seconds')
    .limit(MAX_NOTES_PER_EPISODE);
  if (error) throw new Error(`No pude leer tus notas: ${error.message}`);
  return (data ?? []).map(toNote);
}

export async function addNote(userId: string, episodeId: string, seconds: number, text: string): Promise<Note> {
  const { count } = await db().from('notes').select('id', { count: 'exact', head: true }).match({ user_id: userId, episode_id: episodeId });
  if ((count ?? 0) >= MAX_NOTES_PER_EPISODE) throw new InputError(`Puedes guardar hasta ${MAX_NOTES_PER_EPISODE} notas por episodio.`);
  const { data, error } = await db()
    .from('notes')
    .insert({ user_id: userId, episode_id: episodeId, seconds, text })
    .select('id, seconds, text, created_at')
    .single();
  if (error || !data) throw new Error(`No pude guardar la nota: ${error?.message}`);
  return toNote(data);
}

/** Borra una nota solo si es del usuario. Devuelve si existía. */
export async function deleteNote(userId: string, noteId: string): Promise<boolean> {
  const { data, error } = await db().from('notes').delete().match({ id: noteId, user_id: userId }).select('id');
  if (error) throw new Error(`No pude borrar la nota: ${error.message}`);
  return (data ?? []).length > 0;
}
