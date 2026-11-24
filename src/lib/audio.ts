// Utilidades de audio sin dependencias del servidor (se pueden testear).
import { Mp3Encoder } from '@breezystack/lamejs';
import type { ScriptTurn } from '@/lib/types';

export interface Pcm {
  sampleRate: number;
  samples: Int16Array;
}

/** Lee un WAV PCM de 16 bits mono y devuelve sus muestras. */
export function parseWav(buf: Uint8Array): Pcm {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const tag = (o: number) => String.fromCharCode(buf[o], buf[o + 1], buf[o + 2], buf[o + 3]);
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('El audio no es un WAV válido.');

  let offset = 12;
  let sampleRate = 24000;
  let channels = 1;
  let bits = 16;
  while (offset + 8 <= buf.length) {
    const id = tag(offset);
    let size = view.getUint32(offset + 4, true);
    const body = offset + 8;
    if (id === 'fmt ') {
      channels = view.getUint16(body + 2, true);
      sampleRate = view.getUint32(body + 4, true);
      bits = view.getUint16(body + 14, true);
    } else if (id === 'data') {
      if (bits !== 16) throw new Error(`WAV de ${bits} bits no soportado.`);
      // Algunos generadores dejan el tamaño a 0 o 0xFFFFFFFF en streaming.
      if (size === 0 || body + size > buf.length) size = buf.length - body;
      const frames = Math.floor(size / 2 / channels);
      const samples = new Int16Array(frames);
      for (let i = 0; i < frames; i++) {
        let sum = 0;
        for (let c = 0; c < channels; c++) sum += view.getInt16(body + (i * channels + c) * 2, true);
        samples[i] = Math.round(sum / channels);
      }
      return { sampleRate, samples };
    }
    offset = body + size + (size % 2);
  }
  throw new Error('El WAV no tiene datos de audio.');
}

/** Une varios trozos con un pequeño silencio entre ellos. */
export function concatPcm(parts: Pcm[], gapSeconds = 0.25): { pcm: Pcm; offsets: number[] } {
  if (parts.length === 0) throw new Error('No hay audio que unir.');
  const sampleRate = parts[0].sampleRate;
  if (parts.some((p) => p.sampleRate !== sampleRate)) throw new Error('Los trozos de audio tienen frecuencias distintas.');
  const gap = Math.round(gapSeconds * sampleRate);
  const total = parts.reduce((s, p) => s + p.samples.length, 0) + gap * (parts.length - 1);
  const samples = new Int16Array(total);
  const offsets: number[] = [];
  let pos = 0;
  parts.forEach((p, i) => {
    offsets.push(pos / sampleRate);
    samples.set(p.samples, pos);
    pos += p.samples.length + (i < parts.length - 1 ? gap : 0);
  });
  return { pcm: { sampleRate, samples }, offsets };
}

/**
 * Agrupa intervenciones consecutivas en bloques de ~maxWords palabras.
 * Cada bloque es una petición al TTS (menos peticiones = menos cupo gastado).
 */
export function chunkTurns(turns: ScriptTurn[], maxWords = 130): number[][] {
  const chunks: number[][] = [];
  let current: number[] = [];
  let words = 0;
  turns.forEach((t, i) => {
    const w = t.text.split(/\s+/).filter(Boolean).length;
    if (current.length > 0 && words + w > maxWords) {
      chunks.push(current);
      current = [];
      words = 0;
    }
    current.push(i);
    words += w;
  });
  if (current.length) chunks.push(current);
  return chunks;
}

/**
 * Reparte la duración de cada bloque entre sus intervenciones en proporción a su
 * longitud. Así la transcripción puede resaltarse mientras suena el audio.
 */
export function assignTimings(turns: ScriptTurn[], chunks: number[][], chunkStarts: number[], chunkDurations: number[]): ScriptTurn[] {
  const out = turns.map((t) => ({ ...t }));
  chunks.forEach((indices, c) => {
    const weights = indices.map((i) => turns[i].text.length + 12);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let t = chunkStarts[c];
    indices.forEach((i, k) => {
      const d = (chunkDurations[c] * weights[k]) / totalWeight;
      out[i].start = round2(t);
      out[i].end = round2(t + d);
      t += d;
    });
  });
  return out;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Picos normalizados (0-1) para dibujar la forma de onda. */
export function waveformPeaks(pcm: Pcm, bars = 160): number[] {
  const size = Math.max(1, Math.floor(pcm.samples.length / bars));
  const peaks: number[] = [];
  for (let b = 0; b < bars; b++) {
    let sum = 0;
    const from = b * size;
    const to = Math.min(pcm.samples.length, from + size);
    for (let i = from; i < to; i++) sum += Math.abs(pcm.samples[i]);
    peaks.push(to > from ? sum / (to - from) : 0);
  }
  const max = Math.max(...peaks, 1);
  return peaks.map((p) => Math.round((p / max) * 100) / 100);
}

/** Codifica a MP3 mono (64 kbps): un podcast de 3 minutos ocupa ~1,4 MB en vez de ~9 MB en WAV. */
export function encodeMp3(pcm: Pcm, kbps = 64): Uint8Array {
  const encoder = new Mp3Encoder(1, pcm.sampleRate, kbps);
  const blocks: Uint8Array[] = [];
  const frame = 1152;
  for (let i = 0; i < pcm.samples.length; i += frame) {
    const out = encoder.encodeBuffer(pcm.samples.subarray(i, i + frame));
    if (out.length) blocks.push(new Uint8Array(out));
  }
  const end = encoder.flush();
  if (end.length) blocks.push(new Uint8Array(end));
  const total = blocks.reduce((s, b) => s + b.length, 0);
  const mp3 = new Uint8Array(total);
  let pos = 0;
  for (const b of blocks) {
    mp3.set(b, pos);
    pos += b.length;
  }
  return mp3;
}
