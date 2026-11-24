'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { parseRepoInput } from '@/lib/repo-url';
import { DURATIONS, LANGUAGES, STYLES, type Duration, type Kind, type Language, type Style } from '@/lib/types';

interface Refs {
  defaultBranch: string;
  tags: string[];
  branches: string[];
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm text-ink-300">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {options.map((o) => (
          <label
            key={o.value}
            className={`focus-within:ring-2 focus-within:ring-brand-400 cursor-pointer rounded-xl border px-4 py-2 text-sm transition ${
              value === o.value ? 'border-brand-500 bg-brand-500/15 text-white' : 'border-ink-700 text-ink-300 hover:border-ink-600'
            }`}
          >
            <input type="radio" className="sr-only" checked={value === o.value} onChange={() => onChange(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function NewEpisodeForm({ initialRepo, quota }: { initialRepo: string; quota: { remaining: number; limit: number } }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>('overview');
  const [repoUrl, setRepoUrl] = useState(initialRepo);
  const [ref, setRef] = useState('');
  const [language, setLanguage] = useState<Language>('es');
  const [duration, setDuration] = useState<Duration>('normal');
  const [style, setStyle] = useState<Style>('divulgativo');
  const [refs, setRefs] = useState<Refs | null>(null);
  const [baseRef, setBaseRef] = useState('');
  const [headRef, setHeadRef] = useState('');
  const [loadingRefs, setLoadingRefs] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function loadRefs() {
    const parsed = parseRepoInput(repoUrl);
    if (!parsed) {
      setError('Primero pega una URL de repositorio válida.');
      return;
    }
    setLoadingRefs(true);
    setError('');
    try {
      const res = await fetch(`/api/github/refs?repo=${encodeURIComponent(`${parsed.owner}/${parsed.repo}`)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'No pude cargar las versiones.');
      setRefs(json);
      setHeadRef(json.defaultBranch);
      setBaseRef(json.tags[0] ?? json.branches.find((b: string) => b !== json.defaultBranch) ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No pude cargar las versiones.');
    } finally {
      setLoadingRefs(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!parseRepoInput(repoUrl)) {
      setError('Pega la URL de un repositorio público de GitHub.');
      return;
    }
    if (kind === 'changes' && (!baseRef || !headRef)) {
      setError('Carga las versiones y elige cuáles comparar.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/episodes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          kind,
          repoUrl,
          ref: kind === 'changes' ? headRef : ref || undefined,
          baseRef: kind === 'changes' ? baseRef : undefined,
          language,
          duration,
          style,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'No se pudo crear el podcast.');
      router.push(`/e/${json.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el podcast.');
      setSubmitting(false);
    }
  }

  const allRefs = refs ? [...new Set([refs.defaultBranch, ...refs.tags, ...refs.branches])] : [];

  return (
    <form onSubmit={submit} className="card space-y-7 p-6 sm:p-8">
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            { value: 'overview', title: '🎙️ Explicar el repositorio', text: 'Qué hace y cómo está construido.' },
            { value: 'changes', title: '📰 Novedades entre versiones', text: 'Qué ha cambiado de una versión a otra.' },
          ] as const
        ).map((k) => (
          <button
            type="button"
            key={k.value}
            onClick={() => setKind(k.value)}
            aria-pressed={kind === k.value}
            className={`focus-ring rounded-xl border p-4 text-left transition ${
              kind === k.value ? 'border-brand-500 bg-brand-500/10' : 'border-ink-700 hover:border-ink-600'
            }`}
          >
            <p className="font-medium">{k.title}</p>
            <p className="mt-1 text-sm text-ink-400">{k.text}</p>
          </button>
        ))}
      </div>

      <label className="block">
        <span className="text-sm text-ink-300">Repositorio de GitHub</span>
        <input
          value={repoUrl}
          onChange={(e) => {
            setRepoUrl(e.target.value);
            setRefs(null);
          }}
          placeholder="https://github.com/usuario/repositorio"
          className="focus-ring mt-1.5 w-full rounded-xl border border-ink-700 bg-ink-900 px-3.5 py-3 font-mono text-sm placeholder:text-ink-600"
          required
          spellCheck={false}
        />
      </label>

      {kind === 'overview' ? (
        <details className="group text-sm">
          <summary className="cursor-pointer text-ink-400 hover:text-ink-300">Opciones avanzadas: rama, tag o commit</summary>
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder="Por defecto, la rama principal"
            className="focus-ring mt-2 w-full rounded-xl border border-ink-700 bg-ink-900 px-3.5 py-2.5 font-mono text-sm placeholder:text-ink-600"
          />
        </details>
      ) : (
        <div className="space-y-3">
          {!refs ? (
            <button
              type="button"
              onClick={loadRefs}
              disabled={loadingRefs}
              className="focus-ring rounded-xl border border-ink-700 px-4 py-2.5 text-sm hover:border-brand-500 disabled:opacity-60"
            >
              {loadingRefs ? 'Cargando versiones…' : 'Cargar tags y ramas del repositorio'}
            </button>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="text-ink-300">Desde (versión antigua)</span>
                <select
                  value={baseRef}
                  onChange={(e) => setBaseRef(e.target.value)}
                  className="focus-ring mt-1.5 w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 font-mono"
                >
                  {allRefs.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="text-ink-300">Hasta (versión nueva)</span>
                <select
                  value={headRef}
                  onChange={(e) => setHeadRef(e.target.value)}
                  className="focus-ring mt-1.5 w-full rounded-xl border border-ink-700 bg-ink-900 px-3 py-2.5 font-mono"
                >
                  {allRefs.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </label>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <Segmented
          label="Idioma"
          value={language}
          onChange={setLanguage}
          options={(Object.keys(LANGUAGES) as Language[]).map((l) => ({ value: l, label: LANGUAGES[l] }))}
        />
        <Segmented
          label="Duración"
          value={duration}
          onChange={setDuration}
          options={(Object.keys(DURATIONS) as Duration[]).map((d) => ({ value: d, label: DURATIONS[d].label }))}
        />
      </div>

      <fieldset>
        <legend className="text-sm text-ink-300">Estilo</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {(Object.keys(STYLES) as Style[]).map((s) => (
            <label
              key={s}
              className={`focus-within:ring-2 focus-within:ring-brand-400 cursor-pointer rounded-xl border p-3.5 transition ${
                style === s ? 'border-brand-500 bg-brand-500/10' : 'border-ink-700 hover:border-ink-600'
              }`}
            >
              <input type="radio" className="sr-only" checked={style === s} onChange={() => setStyle(s)} />
              <p className="text-sm font-medium">{STYLES[s].label}</p>
              <p className="mt-0.5 text-xs text-ink-400">{STYLES[s].description}</p>
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-lg border border-onair/30 bg-onair/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      )}

      <div className="flex flex-col-reverse items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-ink-400">
          Te quedan <strong className="text-ink-100">{quota.remaining}</strong> de {quota.limit} podcasts nuevos hoy. Repetir uno ya
          generado no gasta cupo.
        </p>
        <button
          disabled={submitting || quota.remaining === 0}
          className="focus-ring brand-gradient w-full rounded-xl px-6 py-3 font-semibold text-white shadow-lg shadow-pink-500/25 disabled:opacity-50 sm:w-auto"
        >
          {submitting ? 'Preparando…' : 'Generar podcast'}
        </button>
      </div>
    </form>
  );
}
