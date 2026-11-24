'use client';

import Link from 'next/link';
import { useActionState, useRef } from 'react';
import { signIn, signUp, type AuthState } from './actions';

// Cuenta pública de demostración (también figura en el README para la corrección del TFM).
export const DEMO = { email: 'demo@repocast.app', password: 'RepoCast-demo-2026' };

export function AuthForm({ mode, next }: { mode: 'login' | 'register'; next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === 'login' ? signIn : signUp, {});
  const form = useRef<HTMLFormElement>(null);

  function fillDemo() {
    const f = form.current;
    if (!f) return;
    (f.elements.namedItem('email') as HTMLInputElement).value = DEMO.email;
    (f.elements.namedItem('password') as HTMLInputElement).value = DEMO.password;
    f.requestSubmit();
  }

  return (
    <div className="card w-full max-w-md p-8">
      <h1 className="text-2xl font-semibold">{mode === 'login' ? 'Entrar en RepoCast' : 'Crea tu cuenta'}</h1>
      <p className="mt-1 text-sm text-ink-400">
        {mode === 'login' ? 'Para generar podcasts y preguntar al chat.' : 'Gratis. Sin confirmar el email: entras al momento.'}
      </p>

      <form ref={form} action={action} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        <label className="block">
          <span className="text-sm text-ink-300">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            defaultValue={state.email}
            className="focus-ring mt-1.5 w-full rounded-xl border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-sm placeholder:text-ink-600"
            placeholder="tu@email.com"
          />
        </label>
        <label className="block">
          <span className="text-sm text-ink-300">Contraseña</span>
          <input
            name="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'register' ? 8 : undefined}
            className="focus-ring mt-1.5 w-full rounded-xl border border-ink-700 bg-ink-900 px-3.5 py-2.5 text-sm"
          />
        </label>

        {state.error && (
          <p role="alert" className="rounded-lg border border-onair/30 bg-onair/10 px-3 py-2 text-sm text-rose-200">
            {state.error}
          </p>
        )}

        <button
          disabled={pending}
          className="focus-ring brand-gradient w-full rounded-xl py-2.5 text-sm font-semibold text-white shadow-lg shadow-pink-500/20 disabled:opacity-60"
        >
          {pending ? 'Un momento…' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
        </button>
      </form>

      {mode === 'login' && (
        <button
          type="button"
          onClick={fillDemo}
          disabled={pending}
          className="focus-ring mt-3 w-full rounded-xl border border-ink-700 py-2.5 text-sm text-ink-300 hover:border-ink-600 hover:text-white"
        >
          Probar con la cuenta demo
        </button>
      )}

      <p className="mt-6 text-center text-sm text-ink-400">
        {mode === 'login' ? (
          <>
            ¿No tienes cuenta?{' '}
            <Link href={`/registro?next=${encodeURIComponent(next)}`} className="text-brand-400 hover:underline">
              Regístrate
            </Link>
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{' '}
            <Link href={`/entrar?next=${encodeURIComponent(next)}`} className="text-brand-400 hover:underline">
              Entra
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
