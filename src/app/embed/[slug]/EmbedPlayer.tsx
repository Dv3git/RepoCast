'use client';

import { useEffect, useRef } from 'react';
import { LogoMark } from '@/components/Logo';
import { Player, type PlayerHandle } from '@/components/episode/Player';
import { parseTimeParam } from '@/lib/chapters';
import type { PublicEpisode } from '@/lib/types';

export function EmbedPlayer({ episode }: { episode: PublicEpisode }) {
  const pageUrl = `/e/${episode.slug}`;
  const player = useRef<PlayerHandle>(null);

  // ?t=95 en la URL del iframe: el reproductor empieza en ese segundo.
  useEffect(() => {
    const t = parseTimeParam(new URLSearchParams(window.location.search).get('t'));
    if (t !== null) player.current?.seek(t, false);
  }, []);

  return (
    <div className="flex h-[152px] flex-col justify-between overflow-hidden rounded-xl border border-ink-700 bg-gradient-to-br from-ink-850 to-ink-950 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-[11px] text-ink-400">
            {episode.owner}/{episode.repo}
          </p>
          <a href={pageUrl} target="_blank" rel="noreferrer" className="block truncate text-sm font-semibold hover:underline">
            {episode.title ?? `${episode.owner}/${episode.repo}`}
          </a>
        </div>
        <a href={pageUrl} target="_blank" rel="noreferrer" aria-label="Abrir en RepoCast" className="shrink-0">
          <LogoMark className="h-7 w-7" />
        </a>
      </div>
      {episode.status === 'ready' && episode.audioUrl ? (
        <Player ref={player} src={episode.audioUrl} duration={episode.audioSeconds} waveform={episode.waveform} compact />
      ) : (
        <p className="text-sm text-ink-400">Este episodio todavía se está preparando.</p>
      )}
    </div>
  );
}
