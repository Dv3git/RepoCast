'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { parseRepoInput } from '@/lib/repo-url';

const EXAMPLES = ['vercel/swr', 'pallets/flask', 'sindresorhus/ky'];

export function RepoQuickForm() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  function go(input: string) {
    const parsed = parseRepoInput(input);
    if (!parsed) {
      setError('Pega la URL de un repositorio público, por ejemplo github.com/vercel/swr');
      return;
    }
    router.push(`/nuevo?repo=${encodeURIComponent(`${parsed.owner}/${parsed.repo}`)}`);
  }

  return (
    <div className="w-full max-w-2xl">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
        className="flex flex-col gap-2 rounded-2xl border border-ink-700 bg-ink-900/80 p-2 shadow-2xl shadow-brand-500/10 sm:flex-row"
      >
        <label htmlFor="repo-url" className="sr-only">
          URL del repositorio
        </label>
        <div className="flex flex-1 items-center gap-2 px-3">
          <svg viewBox="0 0 16 16" className="h-5 w-5 shrink-0 fill-ink-400" aria-hidden="true">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <input
            id="repo-url"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError('');
            }}
            placeholder="https://github.com/usuario/repositorio"
            className="w-full bg-transparent py-3 text-base outline-none placeholder:text-ink-600"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <button className="focus-ring brand-gradient rounded-xl px-6 py-3 font-semibold text-white shadow-lg shadow-pink-500/25">
          Crear podcast
        </button>
      </form>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink-400">
        {error ? (
          <span role="alert" className="text-rose-300">
            {error}
          </span>
        ) : (
          <>
            <span>Prueba con:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => go(ex)}
                className="focus-ring rounded-full border border-ink-700 px-3 py-1 font-mono text-xs text-ink-300 hover:border-brand-500 hover:text-white"
              >
                {ex}
              </button>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
