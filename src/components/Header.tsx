import Link from 'next/link';
import { Suspense } from 'react';
import { Logo } from '@/components/Logo';
import { getCurrentUser } from '@/lib/supabase/server';

async function UserMenu() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/entrar" className="focus-ring rounded-lg px-3 py-2 text-sm text-ink-300 hover:text-white">
          Entrar
        </Link>
        <Link href="/registro" className="focus-ring brand-gradient rounded-lg px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-pink-500/20">
          Crear cuenta
        </Link>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <Link href="/mis-podcasts" className="focus-ring hidden rounded-lg px-3 py-2 text-sm text-ink-300 hover:text-white sm:block">
        Mis podcasts
      </Link>
      <Link href="/nuevo" className="focus-ring brand-gradient rounded-lg px-3.5 py-2 text-sm font-medium text-white shadow-lg shadow-pink-500/20">
        + Nuevo
      </Link>
      <form action="/auth/salir" method="post">
        <button
          className="focus-ring rounded-lg px-2.5 py-2 text-sm text-ink-400 hover:text-white"
          title={`Cerrar sesión (${user.email})`}
          aria-label="Cerrar sesión"
        >
          Salir
        </button>
      </form>
    </div>
  );
}

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-800/80 bg-ink-950/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="focus-ring rounded-lg" aria-label="RepoCast, inicio">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-1 text-sm md:flex">
            <Link href="/explorar" className="focus-ring rounded-lg px-3 py-2 text-ink-300 hover:text-white">
              Explorar
            </Link>
            <Link href="/#como-funciona" className="focus-ring rounded-lg px-3 py-2 text-ink-300 hover:text-white">
              Cómo funciona
            </Link>
          </nav>
        </div>
        <Suspense fallback={<div className="h-9 w-40 animate-pulse rounded-lg bg-ink-800" />}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ink-800">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 text-sm text-ink-400 sm:flex-row sm:items-center sm:justify-between">
        <p>RepoCast · Trabajo Fin de Máster de Francisco Luis Campos Franco · Desarrollo con IA</p>
        <p>
          Análisis con Claude · Voces con Gemini · Solo repositorios públicos
        </p>
      </div>
    </footer>
  );
}
