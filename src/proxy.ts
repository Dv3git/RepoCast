import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Refresca la sesión de Supabase en cada navegación para que los Server Components
// vean siempre un token válido.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
        },
      },
    },
  );

  await supabase.auth.getClaims();
  return response;
}

export const config = {
  // Ni estáticos, ni la API pública, ni el reproductor incrustado necesitan sesión.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|embed|api/badge|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp3)$).*)'],
};
