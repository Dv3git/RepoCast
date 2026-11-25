'use client';

import { useState } from 'react';
import { toMermaid } from '@/lib/flow';
import type { SequenceFlow } from '@/lib/types';
import type { FileTarget } from './CodeDrawer';
import { SequenceDiagram } from './SequenceDiagram';

interface Props {
  flow: SequenceFlow | null;
  state: 'loading' | 'ready' | 'error';
  onRetry: () => void;
  onOpenFile: (target: FileTarget) => void;
  highlighted?: Set<string>;
}

export function Flow({ flow, state, onRetry, onOpenFile, highlighted }: Props) {
  const [copied, setCopied] = useState(false);

  if (state === 'loading') {
    return (
      <div className="space-y-3" aria-live="polite">
        <p className="text-sm text-ink-400">Claude está dibujando el recorrido principal del código… (tarda unos segundos la primera vez)</p>
        <div className="h-72 animate-pulse rounded-xl bg-ink-800/60" />
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div className="space-y-3 text-sm text-ink-400">
        <p>No he podido preparar el diagrama.</p>
        <button onClick={onRetry} className="focus-ring rounded-lg border border-ink-700 px-3 py-1.5 text-ink-300 hover:text-white">
          Reintentar
        </button>
      </div>
    );
  }
  if (!flow) return <p className="text-sm text-ink-400">Este repositorio no tiene un recorrido claro que dibujar.</p>;

  const names = new Map(flow.participants.map((p) => [p.id, p.name]));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{flow.title}</h3>
          <p className="mt-1 text-sm text-ink-300">{flow.description}</p>
        </div>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(toMermaid(flow));
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          className="focus-ring shrink-0 rounded-lg border border-ink-700 px-3 py-1.5 text-xs text-ink-300 hover:border-ink-600 hover:text-white"
          title="Código Mermaid: se puede pegar en un README de GitHub o en mermaid.live"
        >
          {copied ? '¡Copiado!' : 'Copiar como Mermaid'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-ink-800 bg-ink-950/50 p-2">
        <SequenceDiagram
          flow={flow}
          highlighted={highlighted}
          onStep={(s) => s.file && onOpenFile({ path: s.file, from: s.startLine, to: s.endLine })}
        />
      </div>

      <ol className="space-y-1.5 text-sm">
        {flow.steps.map((s, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="brand-gradient mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white">{i + 1}</span>
            <span className="min-w-0 flex-1 text-ink-300">
              <span className="font-medium text-ink-100">
                {names.get(s.from)} → {names.get(s.to)}:
              </span>{' '}
              {s.label}
              {s.file && (
                <button
                  onClick={() => onOpenFile({ path: s.file as string, from: s.startLine, to: s.endLine })}
                  className="focus-ring ml-2 rounded-md border border-ink-700 bg-ink-900 px-1.5 py-0.5 font-mono text-[11px] text-ink-300 hover:border-brand-500 hover:text-white"
                  title={s.file}
                >
                  {s.file.split('/').pop()}
                  {s.startLine ? `:${s.startLine}` : ''}
                </button>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
