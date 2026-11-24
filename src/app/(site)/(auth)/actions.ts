'use server';

import { redirect } from 'next/navigation';
import { createAuthClient } from '@/lib/supabase/server';

export interface AuthState {
  error?: string;
  email?: string;
}

/** Solo redirige a rutas internas (evita redirecciones abiertas). */
function safeNext(value: FormDataEntryValue | null) {
  const next = typeof value === 'string' ? value : '';
  return next.startsWith('/') && !next.startsWith('//') ? next : '/nuevo';
}

function credentials(formData: FormData) {
  return {
    email: String(formData.get('email') ?? '').trim().toLowerCase(),
    password: String(formData.get('password') ?? ''),
  };
}

export async function signIn(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = credentials(formData);
  if (!email || !password) return { error: 'Escribe tu email y tu contraseña.', email };
  const supabase = await createAuthClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: 'Email o contraseña incorrectos.', email };
  redirect(safeNext(formData.get('next')));
}

export async function signUp(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const { email, password } = credentials(formData);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Ese email no parece válido.', email };
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.', email };
  const supabase = await createAuthClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    const taken = /registered|already/i.test(error.message);
    return { error: taken ? 'Ya hay una cuenta con ese email. Prueba a entrar.' : `No se pudo crear la cuenta: ${error.message}`, email };
  }
  if (!data.session) {
    return { error: 'Cuenta creada, pero el proyecto exige confirmar el email. Revisa tu bandeja de entrada.', email };
  }
  redirect(safeNext(formData.get('next')));
}
