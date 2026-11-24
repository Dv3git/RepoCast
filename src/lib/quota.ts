import 'server-only';
import { LIMITS } from '@/lib/env';
import { db } from '@/lib/supabase/server';

/** Medianoche de hoy en Madrid, en ISO (los cupos se reinician a esa hora). */
export function startOfTodayMadrid(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZoneName: 'longOffset',
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  // "GMT+01:00" en invierno, "GMT+02:00" en verano
  const offset = get('timeZoneName').replace('GMT', '') || '+00:00';
  return new Date(`${get('year')}-${get('month')}-${get('day')}T00:00:00${offset}`).toISOString();
}

export type UsageKind = 'episode' | 'chat';

async function countSince(kind: UsageKind, since: string, userId?: string): Promise<number> {
  let q = db().from('usage_events').select('id', { count: 'exact', head: true }).eq('kind', kind).gte('created_at', since);
  if (userId) q = q.eq('user_id', userId);
  const { count, error } = await q;
  if (error) throw new Error(`No pude consultar el cupo: ${error.message}`);
  return count ?? 0;
}

export interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
}

export async function getQuota(userId: string, kind: UsageKind): Promise<QuotaStatus> {
  const limit = kind === 'episode' ? LIMITS.episodesPerUserPerDay : LIMITS.chatMessagesPerUserPerDay;
  const used = await countSince(kind, startOfTodayMadrid(), userId);
  return { used, limit, remaining: Math.max(0, limit - used) };
}

export class QuotaError extends Error {}

export async function assertQuota(userId: string, kind: UsageKind) {
  const q = await getQuota(userId, kind);
  if (q.remaining <= 0) {
    throw new QuotaError(
      kind === 'episode'
        ? `Has usado tus ${q.limit} podcasts nuevos de hoy. Mañana tendrás más (los ya generados se pueden escuchar sin límite).`
        : `Has llegado al límite de ${q.limit} preguntas de hoy. Vuelve mañana.`,
    );
  }
  if (kind === 'episode') {
    const global = await countSince('episode', startOfTodayMadrid());
    if (global >= LIMITS.episodesGlobalPerDay) {
      throw new QuotaError('RepoCast ha llegado a su límite de podcasts nuevos por hoy. Vuelve mañana o escucha los de la galería.');
    }
  }
}

export async function recordUsage(userId: string, kind: UsageKind) {
  const { error } = await db().from('usage_events').insert({ user_id: userId, kind });
  if (error) throw new Error(`No pude registrar el uso: ${error.message}`);
}
