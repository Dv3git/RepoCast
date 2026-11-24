'use client';

import type { ChangeImpact, CompareStats, HeadlineChange } from '@/lib/types';

const IMPACT: Record<ChangeImpact, { label: string; className: string }> = {
  feature: { label: 'Novedad', className: 'bg-emerald-500/15 text-emerald-300' },
  fix: { label: 'Arreglo', className: 'bg-sky-500/15 text-sky-300' },
  refactor: { label: 'Refactor', className: 'bg-violet-500/15 text-violet-300' },
  breaking: { label: 'Rompe compatibilidad', className: 'bg-rose-500/20 text-rose-300' },
  docs: { label: 'Docs', className: 'bg-slate-500/20 text-slate-300' },
  deps: { label: 'Dependencias', className: 'bg-amber-500/15 text-amber-300' },
  other: { label: 'Otros', className: 'bg-ink-700 text-ink-300' },
};

export function Changes({ changes, stats, onOpenFile }: { changes: HeadlineChange[]; stats: CompareStats | null; onOpenFile: (p: string) => void }) {
  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Commits', stats.commits],
            ['Ficheros', stats.files],
            ['Líneas añadidas', `+${stats.additions}`],
            ['Líneas borradas', `−${stats.deletions}`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-ink-800 bg-ink-900/70 p-3">
              <p className="text-xl font-semibold tabular-nums">{value}</p>
              <p className="text-xs text-ink-400">{label}</p>
            </div>
          ))}
        </div>
      )}
      <ul className="space-y-3">
        {changes.map((c, i) => (
          <li key={i} className="rounded-xl border border-ink-800 bg-ink-900/70 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${IMPACT[c.impact].className}`}>{IMPACT[c.impact].label}</span>
              <h3 className="font-semibold">{c.title}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-ink-300">{c.description}</p>
            {c.files.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.files.map((f) => (
                  <button
                    key={f}
                    onClick={() => onOpenFile(f)}
                    className="focus-ring rounded-md border border-ink-700 bg-ink-950 px-2 py-1 font-mono text-[11px] text-ink-300 hover:border-brand-500 hover:text-white"
                  >
                    {f}
                  </button>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
