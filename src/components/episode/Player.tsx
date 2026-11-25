'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { formatTime } from '@/lib/format';

export interface PlayerHandle {
  seek: (seconds: number, play?: boolean) => void;
}

/** Marca sobre la forma de onda: inicio de capítulo o nota del usuario. */
export interface PlayerMarker {
  at: number;
  kind: 'chapter' | 'note';
  label: string;
}

interface Props {
  src: string;
  duration: number | null;
  waveform: number[] | null;
  onTime?: (seconds: number) => void;
  onFirstPlay?: () => void;
  compact?: boolean;
  downloadName?: string;
  markers?: PlayerMarker[];
  /** Texto junto al tiempo, por ejemplo el capítulo que suena. */
  caption?: string;
}

const SPEEDS = [1, 1.25, 1.5, 2];

export const Player = forwardRef<PlayerHandle, Props>(function Player(
  { src, duration, waveform, onTime, onFirstPlay, compact = false, downloadName, markers = [], caption },
  ref,
) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [total, setTotal] = useState(duration ?? 0);
  const [speed, setSpeed] = useState(1);
  const started = useRef(false);
  // Un salto pedido antes de que el navegador conozca la duración se aplica al cargarla.
  const pendingSeek = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    seek(seconds, play = true) {
      const a = audio.current;
      if (!a) return;
      if (a.readyState === 0) {
        pendingSeek.current = seconds;
        setTime(seconds);
        onTime?.(seconds);
      } else a.currentTime = seconds;
      if (play) void a.play();
    },
  }));

  useEffect(() => {
    const a = audio.current;
    if (a) a.playbackRate = speed;
  }, [speed]);

  function toggle() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) void a.play();
    else a.pause();
  }

  function seekFromBar(e: React.MouseEvent<HTMLDivElement>) {
    const a = audio.current;
    if (!a || !total) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * total;
  }

  function onKey(e: React.KeyboardEvent<HTMLDivElement>) {
    const a = audio.current;
    if (!a) return;
    if (e.key === 'ArrowRight') a.currentTime = Math.min(total, a.currentTime + 5);
    if (e.key === 'ArrowLeft') a.currentTime = Math.max(0, a.currentTime - 5);
  }

  const peaks = waveform && waveform.length ? waveform : Array.from({ length: 120 }, (_, i) => 0.35 + 0.4 * Math.abs(Math.sin(i * 0.9)));
  const bars = compact ? peaks.filter((_, i) => i % 2 === 0) : peaks;
  const progress = total ? time / total : 0;

  return (
    <div className={`flex items-center ${compact ? 'gap-3' : 'gap-4 sm:gap-5'}`}>
      <audio
        ref={audio}
        src={src}
        preload="metadata"
        onPlay={() => {
          setPlaying(true);
          if (!started.current) {
            started.current = true;
            onFirstPlay?.();
          }
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          setTotal(e.currentTarget.duration || duration || 0);
          if (pendingSeek.current !== null) {
            e.currentTarget.currentTime = pendingSeek.current;
            pendingSeek.current = null;
          }
        }}
        onTimeUpdate={(e) => {
          setTime(e.currentTarget.currentTime);
          onTime?.(e.currentTarget.currentTime);
        }}
      />
      <button
        onClick={toggle}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
        className={`focus-ring brand-gradient flex shrink-0 items-center justify-center rounded-full text-white shadow-lg shadow-pink-500/30 transition hover:scale-105 ${
          compact ? 'h-11 w-11' : 'h-16 w-16'
        }`}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className={compact ? 'h-5 w-5' : 'h-7 w-7'} fill="currentColor" aria-hidden="true">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className={`${compact ? 'h-5 w-5' : 'h-7 w-7'} translate-x-0.5`} fill="currentColor" aria-hidden="true">
            <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12.5-7.5a1 1 0 0 0 0-1.72L8.5 3.64A1 1 0 0 0 7 4.5Z" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div
          role="slider"
          tabIndex={0}
          aria-label="Progreso del episodio"
          aria-valuemin={0}
          aria-valuemax={Math.round(total)}
          aria-valuenow={Math.round(time)}
          aria-valuetext={`${formatTime(time)} de ${formatTime(total)}`}
          onClick={seekFromBar}
          onKeyDown={onKey}
          className={`focus-ring relative flex cursor-pointer items-center gap-[2px] rounded ${compact ? 'h-9' : 'h-14'}`}
        >
          {total > 0 &&
            markers.map((m, i) =>
              m.kind === 'chapter' ? (
                m.at > 0 && (
                  <span
                    key={`c${i}`}
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 z-10 w-[3px] -translate-x-1/2 rounded-full bg-ink-950"
                    style={{ left: `${(m.at / total) * 100}%` }}
                  />
                )
              ) : (
                <span
                  key={`n${i}`}
                  aria-hidden="true"
                  title={m.label}
                  className="pointer-events-none absolute -top-1.5 z-10 h-2 w-2 -translate-x-1/2 rounded-full bg-amber-400 ring-2 ring-ink-900"
                  style={{ left: `${Math.min(100, (m.at / total) * 100)}%` }}
                />
              ),
            )}
          {bars.map((p, i) => (
            <span
              key={i}
              className={`flex-1 rounded-full transition-colors ${i / bars.length < progress ? 'bg-gradient-to-t from-brand-500 to-pink-500' : 'bg-ink-600'}`}
              style={{ height: `${Math.max(10, p * 100)}%` }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex items-center justify-between text-xs text-ink-400">
          <span className="min-w-0 truncate">
            <span className="tabular-nums">
              {formatTime(time)} / {formatTime(total)}
            </span>
            {caption && <span className="text-ink-300"> · {caption}</span>}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}
              className="focus-ring rounded-md px-2 py-0.5 tabular-nums hover:bg-ink-800 hover:text-white"
              aria-label="Cambiar velocidad"
            >
              {speed}×
            </button>
            {!compact && downloadName && (
              <a href={src} download={downloadName} className="focus-ring rounded-md px-2 py-0.5 hover:bg-ink-800 hover:text-white">
                Descargar MP3
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
