'use client';

import Link from 'next/link';
import { useState } from 'react';
import { formatTime } from '@/lib/format';
import type { Note } from '@/lib/types';

interface Props {
  slug: string;
  signedIn: boolean;
  notes: Note[] | null;
  error: string;
  time: number;
  onAdd: (seconds: number, text: string) => Promise<boolean>;
  onDelete: (id: string) => void;
  onSeek: (seconds: number) => void;
}

/** Notas y marcadores privados del usuario, cada uno en un momento del audio. */
export function Notes({ slug, signedIn, notes, error, time, onAdd, onDelete, onSeek }: Props) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  if (!signedIn) {
    return (
      <div className="rounded-xl border border-ink-700 p-5 text-sm text-ink-300">
        <p className="font-medium text-ink-100">Guarda notas y marcadores mientras escuchas</p>
        <p className="mt-1">Apunta lo que te interesa en cada momento del audio y vuelve a él con un clic. Tus notas son privadas y salen en la guía descargable.</p>
        <Link href={`/entrar?next=${encodeURIComponent(`/e/${slug}`)}`} className="focus-ring brand-gradient mt-4 inline-block rounded-lg px-3.5 py-2 font-medium text-white">
          Entrar para tomar notas
        </Link>
      </div>
    );
  }

  async function save(withText: boolean) {
    setSaving(true);
    const ok = await onAdd(time, withText ? text.trim() : '');
    setSaving(false);
    if (ok && withText) setText('');
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) void save(true);
        }}
        className="space-y-2"
      >
        <label htmlFor="note-text" className="text-sm text-ink-300">
          Nota en el <span className="font-medium tabular-nums text-white">{formatTime(time)}</span>
        </label>
        <textarea
          id="note-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && text.trim()) void save(true);
          }}
          rows={2}
          maxLength={1000}
          placeholder="¿Qué quieres recordar de este momento?"
          className="w-full resize-none rounded-lg border border-ink-700 bg-ink-950 p-2.5 text-sm placeholder:text-ink-400 focus:border-brand-500 focus:outline-none"
        />
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            disabled={saving || !text.trim()}
            className="focus-ring brand-gradient rounded-lg px-3.5 py-1.5 text-sm font-medium text-white disabled:opacity-50"
          >
            Guardar nota
          </button>
          <button
            type="button"
            onClick={() => void save(false)}
            disabled={saving}
            className="focus-ring rounded-lg border border-ink-700 px-3 py-1.5 text-sm text-ink-300 hover:border-ink-600 hover:text-white disabled:opacity-50"
          >
            🔖 Marcar este momento
          </button>
        </div>
      </form>

      {error && <p className="text-sm text-rose-400">{error}</p>}

      {notes === null ? (
        <div className="h-16 animate-pulse rounded-xl bg-ink-800/60" />
      ) : notes.length === 0 ? (
        <p className="text-sm text-ink-400">Todavía no tienes notas en este episodio. Aparecerán como puntos amarillos sobre el audio.</p>
      ) : (
        <ul className="space-y-1.5">
          {notes.map((n) => (
            <li key={n.id} className="group flex items-start gap-3 rounded-xl px-3 py-2 hover:bg-ink-800/60">
              <button
                onClick={() => onSeek(n.seconds)}
                className="focus-ring shrink-0 rounded-md bg-amber-400/15 px-2 py-0.5 text-xs font-medium tabular-nums text-amber-300 hover:bg-amber-400/25"
                aria-label={`Ir al ${formatTime(n.seconds)}`}
              >
                {formatTime(n.seconds)}
              </button>
              <p className="min-w-0 flex-1 text-sm break-words whitespace-pre-line text-ink-300">{n.text || <span className="italic text-ink-400">Marcador</span>}</p>
              <button
                onClick={() => onDelete(n.id)}
                className="focus-ring shrink-0 rounded-md px-1.5 text-xs text-ink-400 hover:text-rose-400 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                aria-label="Borrar nota"
              >
                Borrar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
