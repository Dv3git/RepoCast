'use client';

import { useEffect, useRef, useState } from 'react';

export interface FileTarget {
  path: string;
  from?: number;
  to?: number;
}

interface FileResponse {
  path: string;
  kind: 'file' | 'diff';
  html: string | null;
  githubUrl: string;
  totalLines?: number;
  clipped?: boolean;
  status?: string;
  additions?: number;
  deletions?: number;
  error?: string;
}

/** Carga un fichero resaltado desde la API y lo pinta (sirve para el panel lateral y la visita guiada). */
export function CodeView({ episodeId, target, className = '' }: { episodeId: string; target: FileTarget; className?: string }) {
  const key = `${episodeId}|${target.path}:${target.from ?? ''}-${target.to ?? ''}`;
  // El resultado va asociado a su clave: si cambia el fichero, lo anterior deja de valer solo.
  const [result, setResult] = useState<{ key: string; data?: FileResponse; error?: string } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const data = result?.key === key ? (result.data ?? null) : null;
  const error = result?.key === key ? (result.error ?? '') : '';

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams({ path: target.path });
    if (target.from) qs.set('from', String(target.from));
    if (target.to) qs.set('to', String(target.to));
    fetch(`/api/episodes/${episodeId}/file?${qs}`)
      .then(async (r) => {
        const json = (await r.json()) as FileResponse;
        if (cancelled) return;
        setResult(r.ok ? { key, data: json } : { key, error: json.error ?? 'No se pudo cargar el fichero.' });
      })
      .catch(() => !cancelled && setResult({ key, error: 'No se pudo cargar el fichero.' }));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Lleva la vista a las líneas destacadas
  useEffect(() => {
    const first = box.current?.querySelector<HTMLElement>('[data-hl]');
    if (first && box.current) box.current.scrollTop = Math.max(0, first.offsetTop - 60);
  }, [data]);

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-ink-800 px-4 py-2.5">
        <p className="truncate font-mono text-xs text-ink-300" title={target.path}>
          {target.path}
          {target.from ? <span className="text-ink-400">:{target.from}{target.to && target.to !== target.from ? `-${target.to}` : ''}</span> : null}
        </p>
        {data && (
          <a href={data.githubUrl} target="_blank" rel="noreferrer" className="shrink-0 text-xs text-brand-400 hover:underline">
            Ver en GitHub ↗
          </a>
        )}
      </div>
      <div ref={box} className={`code-view ${data?.kind === 'diff' ? 'diff' : ''} relative min-h-0 flex-1 overflow-auto bg-ink-950/60`}>
        {error ? (
          <p className="p-4 text-sm text-ink-400">{error}</p>
        ) : !data ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="h-3 animate-pulse rounded bg-ink-800" style={{ width: `${40 + ((i * 37) % 55)}%` }} />
            ))}
          </div>
        ) : data.html ? (
          <div dangerouslySetInnerHTML={{ __html: data.html }} />
        ) : (
          <p className="p-4 text-sm text-ink-400">GitHub no muestra el diff de este fichero (binario o demasiado grande).</p>
        )}
      </div>
      {data?.clipped && <p className="border-t border-ink-800 px-4 py-2 text-xs text-ink-400">Fichero largo: se muestran las primeras 1500 líneas.</p>}
    </div>
  );
}

/** Panel lateral con el código: se abre desde el mapa, la transcripción o el chat. */
export function CodeDrawer({ episodeId, target, onClose }: { episodeId: string; target: FileTarget | null; onClose: () => void }) {
  useEffect(() => {
    if (!target) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [target, onClose]);

  if (!target) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label={`Código de ${target.path}`}>
      <button className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Cerrar" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-3xl flex-col border-l border-ink-700 bg-ink-900 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-medium">Código</p>
          <button onClick={onClose} className="focus-ring rounded-lg px-2 py-1 text-sm text-ink-400 hover:bg-ink-800 hover:text-white" autoFocus>
            Cerrar ✕
          </button>
        </div>
        <CodeView episodeId={episodeId} target={target} className="flex-1" />
      </div>
    </div>
  );
}
