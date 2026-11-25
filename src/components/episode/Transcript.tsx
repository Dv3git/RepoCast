'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { formatTime } from '@/lib/format';
import { SPEAKERS, type Language, type ScriptTurn } from '@/lib/types';

interface Props {
  turns: ScriptTurn[];
  language: Language;
  active: number;
  following: boolean;
  onSeek: (seconds: number) => void;
  onOpenFile: (path: string) => void;
  /** Título del capítulo que empieza en cada intervención. */
  chapterTitles?: Map<number, string>;
  /** Enlace para compartir una intervención concreta. */
  linkFor?: (seconds: number) => string;
}

function shortName(path: string) {
  return path.split('/').pop() ?? path;
}

export function Transcript({ turns, language, active, following, onSeek, onOpenFile, chapterTitles, linkFor }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState<number | null>(null);

  async function copyLink(i: number, seconds: number) {
    if (!linkFor) return;
    await navigator.clipboard.writeText(linkFor(seconds));
    setCopied(i);
    setTimeout(() => setCopied((c) => (c === i ? null : c)), 1600);
  }

  // Mientras suena, mantiene a la vista la intervención activa (solo dentro del panel).
  useEffect(() => {
    if (!following || active < 0) return;
    const el = box.current?.querySelector<HTMLElement>(`[data-turn="${active}"]`);
    if (el && box.current) {
      const target = el.offsetTop - box.current.clientHeight / 3;
      box.current.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
    }
  }, [active, following]);

  const speakers = SPEAKERS[language];

  return (
    <div ref={box} className="relative max-h-[640px] space-y-1 overflow-y-auto pr-1">
      {turns.map((t, i) => {
        const isActive = i === active;
        const host = t.speaker === 'host';
        const chapter = chapterTitles?.get(i);
        return (
          <Fragment key={i}>
          {chapter && (
            <h3 className={`px-3 pb-1 text-xs font-semibold tracking-wide text-ink-400 uppercase ${i === 0 ? '' : 'pt-4'}`}>{chapter}</h3>
          )}
          <div
            data-turn={i}
            className={`group relative rounded-xl px-3 py-2.5 transition ${isActive ? 'bg-brand-500/12 ring-1 ring-brand-500/40' : 'hover:bg-ink-800/60'}`}
          >
            <button
              onClick={() => t.start !== undefined && onSeek(t.start)}
              className="focus-ring w-full rounded text-left"
              aria-label={`Ir al ${t.start !== undefined ? formatTime(t.start) : 'momento'}: ${speakers[t.speaker].name}`}
            >
              <span className="flex items-center gap-2 text-xs">
                <span className={`font-semibold ${host ? 'text-brand-400' : 'text-pink-400'}`}>{speakers[t.speaker].name}</span>
                {t.start !== undefined && <span className="tabular-nums text-ink-400">{formatTime(t.start)}</span>}
              </span>
              <span className={`mt-1 block text-[15px] leading-relaxed ${isActive ? 'text-white' : 'text-ink-300'}`}>{t.text}</span>
            </button>
            {linkFor && t.start !== undefined && (
              <button
                onClick={() => void copyLink(i, t.start as number)}
                className={`focus-ring absolute top-2 right-2 rounded-md px-1.5 py-0.5 text-[11px] text-ink-400 transition hover:bg-ink-800 hover:text-white ${
                  copied === i ? 'opacity-100' : 'focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100'
                }`}
                aria-label={`Copiar enlace a este momento (${formatTime(t.start)})`}
              >
                {copied === i ? '¡Enlace copiado!' : '🔗 Enlace'}
              </button>
            )}
            {t.files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {t.files.slice(0, 4).map((f) => (
                  <button
                    key={f}
                    onClick={() => onOpenFile(f)}
                    title={f}
                    className="focus-ring rounded-md border border-ink-700 bg-ink-900 px-2 py-0.5 font-mono text-[11px] text-ink-300 hover:border-brand-500 hover:text-white"
                  >
                    {shortName(f)}
                  </button>
                ))}
              </div>
            )}
          </div>
          </Fragment>
        );
      })}
    </div>
  );
}
