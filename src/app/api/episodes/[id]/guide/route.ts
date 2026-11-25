import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { buildGuideMarkdown, guideFileName } from '@/lib/guide';
import { getGuideData } from '@/lib/guide-data';
import { getCurrentUser } from '@/lib/supabase/server';

export const maxDuration = 120;

// Descarga la guía escrita del episodio en Markdown. Si hay sesión, incluye las notas del usuario.
export async function GET(request: Request, ctx: RouteContext<'/api/episodes/[id]/guide'>) {
  const { id } = await ctx.params;
  try {
    const user = await getCurrentUser();
    const data = await getGuideData(id, user?.id ?? null);
    if (!data) return NextResponse.json({ error: 'La guía estará disponible cuando termine el episodio.' }, { status: 404 });
    const markdown = buildGuideMarkdown({ ...data, origin: new URL(request.url).origin, generatedAt: new Date().toISOString() });
    return new Response(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${guideFileName(data.episode.slug)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    return apiError(err);
  }
}
