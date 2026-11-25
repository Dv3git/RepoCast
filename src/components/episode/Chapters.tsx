'use client';

import type { TimedChapter } from '@/lib/chapters';
import { formatTime } from '@/lib/format';

/** Capítulos del episodio: se pulsa uno para saltar a ese momento. */
export function Chapters({ chapters, active, onSeek }: { chapters: TimedChapter[]; active: number; onSeek: (seconds: number) => void }) {
  if (chapters.length === 0) return null;
  return (
    <nav aria-label="Capítulos" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
      {chapters.map((c, i) => (
        <button
          key={c.turn}
          onClick={() => onSeek(c.start)}
          aria-current={i === active ? 'true' : undefined}
          className={`focus-ring flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition ${
            i === active ? 'border-brand-500/60 bg-brand-500/15 text-white' : 'border-ink-700 text-ink-300 hover:border-ink-600 hover:text-white'
          }`}
        >
          <span className="tabular-nums text-xs text-ink-400">{formatTime(c.start)}</span>
          <span className="max-w-56 truncate">{c.title}</span>
        </button>
      ))}
    </nav>
  );
}
