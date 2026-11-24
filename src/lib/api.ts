import 'server-only';
import { NextResponse } from 'next/server';
import { InputError } from '@/lib/episodes';
import { GitHubError } from '@/lib/github';
import { QuotaError } from '@/lib/quota';

/** Convierte errores conocidos en respuestas JSON con el código HTTP adecuado. */
export function apiError(err: unknown) {
  if (err instanceof InputError) return NextResponse.json({ error: err.message }, { status: 400 });
  if (err instanceof QuotaError) return NextResponse.json({ error: err.message }, { status: 429 });
  if (err instanceof GitHubError) return NextResponse.json({ error: err.message }, { status: err.status === 404 ? 404 : 502 });
  console.error('[api]', err);
  return NextResponse.json({ error: 'Algo ha fallado en el servidor. Inténtalo de nuevo.' }, { status: 500 });
}

export function unauthorized() {
  return NextResponse.json({ error: 'Tienes que iniciar sesión.' }, { status: 401 });
}
