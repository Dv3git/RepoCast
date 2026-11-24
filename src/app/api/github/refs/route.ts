import { NextResponse } from 'next/server';
import { apiError, unauthorized } from '@/lib/api';
import { InputError } from '@/lib/episodes';
import { listRefs, parseRepoInput } from '@/lib/github';
import { getCurrentUser } from '@/lib/supabase/server';

// Ramas y tags de un repositorio, para elegir las dos versiones de un "podcast de novedades".
export async function GET(request: Request) {
  if (!(await getCurrentUser())) return unauthorized();
  try {
    const parsed = parseRepoInput(new URL(request.url).searchParams.get('repo') ?? '');
    if (!parsed) throw new InputError('URL de repositorio no válida.');
    return NextResponse.json(await listRefs(parsed.owner, parsed.repo));
  } catch (err) {
    return apiError(err);
  }
}
