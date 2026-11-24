'use client';

import { useState } from 'react';
import type { TourStep } from '@/lib/types';
import { CodeView } from './CodeDrawer';

export function Tour({ episodeId, steps }: { episodeId: string; steps: TourStep[] }) {
  const [index, setIndex] = useState(0);
  if (steps.length === 0) return <p className="text-sm text-ink-400">No hay visita guiada para este episodio.</p>;
  const step = steps[index];

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {steps.map((s, i) => (
          <li key={i} className="shrink-0">
            <button
              onClick={() => setIndex(i)}
              aria-current={i === index ? 'step' : undefined}
              className={`focus-ring flex w-full items-start gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition ${
                i === index ? 'bg-brand-500/15 text-white' : 'text-ink-300 hover:bg-ink-800'
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                  i === index ? 'brand-gradient text-white' : 'bg-ink-700 text-ink-300'
                }`}
              >
                {i + 1}
              </span>
              <span className="max-w-48 lg:max-w-none">{s.title}</span>
            </button>
          </li>
        ))}
      </ol>

      <div className="min-w-0 space-y-3">
        <div>
          <p className="text-xs text-ink-400">
            Parada {index + 1} de {steps.length}
          </p>
          <h3 className="mt-0.5 text-lg font-semibold">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-300">{step.explanation}</p>
        </div>
        <div className="overflow-hidden rounded-xl border border-ink-800">
          <CodeView episodeId={episodeId} target={{ path: step.file, from: step.startLine, to: step.endLine }} className="h-[380px]" />
        </div>
        <div className="flex justify-between">
          <button
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0}
            className="focus-ring rounded-lg border border-ink-700 px-3 py-1.5 text-sm text-ink-300 hover:text-white disabled:opacity-40"
          >
            ← Anterior
          </button>
          <button
            onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
            disabled={index === steps.length - 1}
            className="focus-ring rounded-lg border border-ink-700 px-3 py-1.5 text-sm text-ink-300 hover:text-white disabled:opacity-40"
          >
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  );
}
