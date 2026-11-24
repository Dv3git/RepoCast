import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/database.types';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { env } from '@/lib/env';

/** Cliente con la sesión del usuario (cookies). Solo para autenticación. */
export async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, env.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Desde un Server Component no se pueden escribir cookies; el proxy ya refresca la sesión.
        }
      },
    },
  });
}

export interface CurrentUser {
  id: string;
  email: string;
}

/** Usuario actual a partir del JWT de la sesión, o null si no hay sesión. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // El cliente de Supabase consulta la hora actual (caducidad del JWT): eso solo puede
  // ocurrir al atender la petición, nunca durante el prerenderizado del App Shell.
  await connection();
  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: String(claims.email ?? '') };
}

let admin: SupabaseClient<Database> | null = null;

/**
 * Cliente de servidor con la clave secreta. Todas las tablas tienen RLS sin políticas
 * públicas, así que solo el servidor puede leer y escribir datos.
 */
export function db(): SupabaseClient<Database> {
  admin ??= createSupabaseClient<Database>(env.supabaseUrl, env.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}
