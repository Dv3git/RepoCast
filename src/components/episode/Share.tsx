'use client';

import { useEffect, useState } from 'react';
import { linkAt } from '@/lib/chapters';
import { formatTime } from '@/lib/format';

function CopyField({ label, value, multiline = false }: { label: string; value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-300">{label}</p>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1600);
          }}
          className="focus-ring rounded-md px-2 py-1 text-xs text-brand-400 hover:bg-ink-800"
        >
          {copied ? '¡Copiado!' : 'Copiar'}
        </button>
      </div>
      {multiline ? (
        <textarea readOnly value={value} rows={3} className="mt-1.5 w-full resize-none rounded-lg border border-ink-700 bg-ink-950 p-2.5 font-mono text-xs text-ink-300" />
      ) : (
        <input readOnly value={value} className="mt-1.5 w-full rounded-lg border border-ink-700 bg-ink-950 p-2.5 font-mono text-xs text-ink-300" />
      )}
    </div>
  );
}

interface ShareProps {
  slug: string;
  title: string;
  audioUrl: string | null;
  /** Segundo que suena ahora, para compartir desde ese momento. */
  time: number;
  guideUrl: string;
  markdownUrl: string;
}

export function Share({ slug, title, audioUrl, time, guideUrl, markdownUrl }: ShareProps) {
  const [origin, setOrigin] = useState('');
  const [fromNow, setFromNow] = useState(false);
  const at = fromNow ? Math.floor(time) : 0;
  // La URL pública depende del dominio en el que se esté viendo la app.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOrigin(window.location.origin), []);

  const pageUrl = linkAt(`${origin}/e/${slug}`, at);
  const embed = `<iframe src="${linkAt(`${origin}/embed/${slug}`, at)}" width="100%" height="152" style="border:0;border-radius:12px" title="${title.replace(/"/g, '&quot;')} · RepoCast" loading="lazy"></iframe>`;
  const badge = `[![Escúchalo en RepoCast](${origin}/api/badge/${slug})](${origin}/e/${slug})`;
  const text = encodeURIComponent(`🎙️ ${title} — escucha este repositorio explicado en un podcast`);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <CopyField label="Enlace del episodio" value={pageUrl} />
        <label className="flex items-center gap-2 text-sm text-ink-300">
          <input type="checkbox" checked={fromNow} onChange={(e) => setFromNow(e.target.checked)} className="accent-brand-500" />
          Empezar en el <span className="tabular-nums">{formatTime(time)}</span> (también en el reproductor incrustado)
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          className="focus-ring rounded-lg border border-ink-700 px-3 py-2 text-sm hover:border-ink-600"
          href={`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(pageUrl)}`}
          target="_blank"
          rel="noreferrer"
        >
          Compartir en X
        </a>
        <a
          className="focus-ring rounded-lg border border-ink-700 px-3 py-2 text-sm hover:border-ink-600"
          href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(pageUrl)}`}
          target="_blank"
          rel="noreferrer"
        >
          Compartir en LinkedIn
        </a>
        {audioUrl && (
          <a className="focus-ring rounded-lg border border-ink-700 px-3 py-2 text-sm hover:border-ink-600" href={audioUrl} download={`${slug}.mp3`}>
            Descargar MP3
          </a>
        )}
        <a className="focus-ring rounded-lg border border-ink-700 px-3 py-2 text-sm hover:border-ink-600" href={guideUrl} target="_blank" rel="noreferrer">
          Guía escrita (PDF)
        </a>
        <a className="focus-ring rounded-lg border border-ink-700 px-3 py-2 text-sm hover:border-ink-600" href={markdownUrl} download>
          Guía en Markdown
        </a>
      </div>

      <div>
        <CopyField label="Insignia para el README del proyecto (Markdown)" value={badge} multiline />
        {origin && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/api/badge/${slug}`} alt="Vista previa de la insignia" className="mt-2 h-[22px]" />
        )}
      </div>

      <div>
        <CopyField label="Reproductor para incrustar en tu web" value={embed} multiline />
        {origin && (
          <iframe src={`/embed/${slug}`} className="mt-3 h-[152px] w-full rounded-xl border-0" title="Vista previa del reproductor" loading="lazy" />
        )}
      </div>
    </div>
  );
}
