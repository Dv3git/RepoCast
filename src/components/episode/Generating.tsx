'use client';

import { useEffect, useRef, useState } from 'react';
import { STATUS_LABELS, type EpisodeStatus, type PublicEpisode } from '@/lib/types';

const STEPS: EpisodeStatus[] = ['ingesting', 'analyzing', 'scripting', 'voicing'];
const HINTS: Partial<Record<EpisodeStatus, string>> = {
  ingesting: 'Elegimos los ficheros que importan: README, manifiestos, puntos de entrada…',
  analyzing: 'Claude está leyendo el código y dibujando el mapa. Es el paso más largo.',
  scripting: 'Lucía y Mateo están ensayando el guion.',
  voicing: 'Grabando las dos voces y montando el episodio.',
};

function stepIndex(status: EpisodeStatus) {
  return status === 'queued' ? 0 : STEPS.indexOf(status);
}

/**
 * Mientras el episodio no esté listo, va pidiendo al servidor que ejecute el siguiente
 * paso y consulta el estado. Cuando termina avisa con onDone.
 */
export function Generating({ episode, onUpdate, onDone }: { episode: PublicEpisode; onUpdate: (e: PublicEpisode) => void; onDone: () => void }) {
  const [current, setCurrent] = useState(episode);
  const [retrying, setRetrying] = useState(false);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    let stopped = false;

    async function loop() {
      while (!stopped) {
        try {
          await fetch(`/api/episodes/${episode.id}/advance`, { method: 'POST' });
          const res = await fetch(`/api/episodes/${episode.id}`, { cache: 'no-store' });
          if (res.ok) {
            const next = (await res.json()) as PublicEpisode;
            if (stopped) return;
            setCurrent(next);
            onUpdate(next);
            if (next.status === 'ready') {
              onDone();
              return;
            }
            if (next.status === 'failed') return;
          }
        } catch {
          // red caída: lo volvemos a intentar
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
    }

    if (current.status !== 'failed') void loop();
    return () => {
      stopped = true;
      alive.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode.id, retrying]);

  async function retry() {
    const res = await fetch(`/api/episodes/${episode.id}/retry`, { method: 'POST' });
    if (res.ok) {
      setCurrent({ ...current, status: 'queued', error: null });
      setRetrying((r) => !r);
    }
  }

  const failed = current.status === 'failed';
  const active = stepIndex(current.status);

  return (
    <div className="card mx-auto max-w-2xl p-8">
      {!failed ? (
        <div className="flex items-center gap-4">
          <div className="flex h-12 items-end gap-1" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="eq-bar brand-gradient block h-full w-2 rounded-full" style={{ animationDelay: `${i * 0.13}s` }} />
            ))}
          </div>
          <div>
            <h2 className="text-xl font-semibold">Preparando tu episodio…</h2>
            <p className="text-sm text-ink-400">Suele tardar entre uno y tres minutos. Puedes dejar esta página abierta.</p>
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold">No se pudo generar el episodio</h2>
          <p className="mt-2 rounded-lg border border-onair/30 bg-onair/10 px-3 py-2 text-sm text-rose-200">{current.error ?? 'Error desconocido.'}</p>
          {current.isOwner && (
            <button onClick={retry} className="focus-ring brand-gradient mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
              Reintentar
            </button>
          )}
        </div>
      )}

      <ol className="mt-8 space-y-3" aria-live="polite">
        {STEPS.map((s, i) => {
          const done = !failed && i < active;
          const now = !failed && i === active;
          return (
            <li key={s} className="flex items-start gap-3">
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                  done ? 'bg-emerald-500/20 text-emerald-300' : now ? 'brand-gradient text-white' : 'bg-ink-800 text-ink-400'
                }`}
              >
                {done ? '✓' : i + 1}
              </span>
              <div>
                <p className={now ? 'font-medium text-white' : done ? 'text-ink-300' : 'text-ink-400'}>{STATUS_LABELS[s]}</p>
                {now && <p className="mt-0.5 text-sm text-ink-400">{current.statusDetail ?? HINTS[s]}</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
