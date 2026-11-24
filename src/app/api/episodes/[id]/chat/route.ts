import { NextResponse } from 'next/server';
import { z } from 'zod/v4';
import { apiError, unauthorized } from '@/lib/api';
import { chatStream } from '@/lib/claude';
import { getEpisodeById, getEpisodeInternals, InputError } from '@/lib/episodes';
import { assertQuota, recordUsage } from '@/lib/quota';
import { loadSnapshot } from '@/lib/snapshot';
import { getCurrentUser } from '@/lib/supabase/server';

export const maxDuration = 120;

const Body = z.object({
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(20),
});

export async function POST(request: Request, ctx: RouteContext<'/api/episodes/[id]/chat'>) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  try {
    const parsed = Body.safeParse(await request.json());
    if (!parsed.success) throw new InputError('Mensaje no válido.');
    const messages = parsed.data.messages.slice(-12);
    if (messages[0].role !== 'user') messages.shift();
    if (messages.at(-1)?.role !== 'user') throw new InputError('Falta tu pregunta.');

    const episode = await getEpisodeById(id);
    if (!episode) return NextResponse.json({ error: 'No existe ese podcast.' }, { status: 404 });
    const { snapshotPath, analysis } = await getEpisodeInternals(id);
    if (!snapshotPath || !analysis) throw new InputError('El chat estará disponible cuando termine el análisis.');

    await assertQuota(user.id, 'chat');
    await recordUsage(user.id, 'chat');
    const snapshot = await loadSnapshot(snapshotPath);
    const stream = chatStream(snapshot, analysis, episode.language, messages);

    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          const final = await stream.finalMessage();
          if (final.stop_reason === 'refusal') controller.enqueue(encoder.encode('\n\n_(No puedo responder a eso.)_'));
        } catch (err) {
          console.error('[chat]', err);
          controller.enqueue(encoder.encode('\n\n_(Se ha cortado la respuesta. Inténtalo de nuevo.)_'));
        } finally {
          controller.close();
        }
      },
      cancel() {
        stream.abort();
      },
    });

    return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' } });
  } catch (err) {
    return apiError(err);
  }
}
