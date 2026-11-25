// Capítulos del podcast y enlaces a un momento concreto del audio.
import type { Chapter, ScriptTurn } from '@/lib/types';

export const MAX_CHAPTERS = 7;

/** Deja los capítulos ordenados, sin repetidos, dentro del guion y empezando por el principio. */
export function cleanChapters(chapters: Chapter[], turnCount: number): Chapter[] {
  const byTurn = new Map<number, string>();
  for (const c of chapters) {
    const title = c.title.replace(/\s+/g, ' ').trim().slice(0, 60);
    if (!Number.isInteger(c.turn) || c.turn < 0 || c.turn >= turnCount || !title || byTurn.has(c.turn)) continue;
    byTurn.set(c.turn, title);
  }
  const sorted = [...byTurn.entries()].sort((a, b) => a[0] - b[0]).map(([turn, title]) => ({ turn, title }));
  if (sorted.length === 0) return [];
  sorted[0] = { ...sorted[0], turn: 0 };
  return sorted.slice(0, MAX_CHAPTERS);
}

export interface TimedChapter extends Chapter {
  start: number;
}

/** Capítulos con su segundo de inicio (solo los que ya tienen tiempos). */
export function timedChapters(chapters: Chapter[] | null, turns: ScriptTurn[]): TimedChapter[] {
  if (!chapters) return [];
  return chapters
    .filter((c) => turns[c.turn]?.start !== undefined)
    .map((c) => ({ ...c, start: c.turn === 0 ? 0 : (turns[c.turn].start as number) }));
}

/** Índice del capítulo que suena en el segundo `time`, o -1. */
export function chapterAt(chapters: TimedChapter[], time: number): number {
  let index = -1;
  chapters.forEach((c, i) => {
    if (time >= c.start) index = i;
  });
  return index;
}

/** Lee el parámetro ?t= de un enlace: "95", "95s", "1:35" o "1m35s". Devuelve segundos o null. */
export function parseTimeParam(value: string | null | undefined): number | null {
  if (!value) return null;
  const v = value.trim().toLowerCase();
  let seconds: number | null = null;
  if (/^\d+(\.\d+)?s?$/.test(v)) seconds = parseFloat(v);
  else if (/^\d+:\d{1,2}$/.test(v)) {
    const [m, s] = v.split(':').map(Number);
    seconds = s < 60 ? m * 60 + s : null;
  } else {
    const m = v.match(/^(?:(\d+)m)?(?:(\d+)s)?$/);
    if (m && (m[1] || m[2])) seconds = Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
  }
  return seconds !== null && Number.isFinite(seconds) ? seconds : null;
}

/** Enlace a un episodio empezando en un segundo concreto. */
export function linkAt(base: string, seconds: number) {
  const t = Math.floor(seconds);
  return t > 0 ? `${base}?t=${t}` : base;
}
