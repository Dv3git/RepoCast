import { NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { apiError, unauthorized } from '@/lib/api';
import { createEpisode, InputError } from '@/lib/episodes';
import { getCurrentUser } from '@/lib/supabase/server';

const Body = z.object({
  kind: z.enum(['overview', 'changes']),
  repoUrl: z.string().min(3).max(300),
  ref: z.string().max(200).optional(),
  baseRef: z.string().max(200).optional(),
  language: z.enum(['es', 'en']),
  duration: z.enum(['short', 'normal', 'long']),
  style: z.enum(['divulgativo', 'tecnico', 'humor']),
});

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  try {
    const parsed = Body.safeParse(await request.json());
    if (!parsed.success) throw new InputError('Revisa los datos del formulario.');
    const result = await createEpisode(parsed.data, user.id);
    return NextResponse.json(result, { status: result.reused ? 200 : 201 });
  } catch (err) {
    return apiError(err);
  }
}
