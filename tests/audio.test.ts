import { describe, expect, it } from 'vitest';
import { assignTimings, chunkTurns, concatPcm, encodeMp3, parseWav, waveformPeaks } from '@/lib/audio';
import type { ScriptTurn } from '@/lib/types';

function makeWav(samples: number[], sampleRate = 24000): Uint8Array {
  const data = samples.length * 2;
  const buf = new ArrayBuffer(44 + data);
  const v = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF');
  v.setUint32(4, 36 + data, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, data, true);
  samples.forEach((s, i) => v.setInt16(44 + i * 2, s, true));
  return new Uint8Array(buf);
}

const turn = (text: string, speaker: 'host' | 'guest' = 'host'): ScriptTurn => ({ speaker, text, files: [] });

describe('parseWav', () => {
  it('lee la frecuencia y las muestras', () => {
    const pcm = parseWav(makeWav([0, 1000, -1000, 32767]));
    expect(pcm.sampleRate).toBe(24000);
    expect([...pcm.samples]).toEqual([0, 1000, -1000, 32767]);
  });

  it('rechaza ficheros que no son WAV', () => {
    expect(() => parseWav(new Uint8Array(64))).toThrow();
  });
});

describe('concatPcm', () => {
  it('une los trozos con silencio y devuelve dónde empieza cada uno', () => {
    const a = { sampleRate: 10, samples: new Int16Array([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]) };
    const b = { sampleRate: 10, samples: new Int16Array([2, 2, 2, 2, 2]) };
    const { pcm, offsets } = concatPcm([a, b], 0.5);
    expect(pcm.samples.length).toBe(10 + 5 + 5);
    expect(offsets).toEqual([0, 1.5]);
    expect(pcm.samples[12]).toBe(0);
    expect(pcm.samples[15]).toBe(2);
  });
});

describe('chunkTurns', () => {
  it('agrupa intervenciones sin pasarse de palabras', () => {
    const turns = [turn('uno dos tres'), turn('cuatro cinco'), turn('seis siete ocho nueve'), turn('diez')];
    expect(chunkTurns(turns, 5)).toEqual([[0, 1], [2, 3]]);
  });

  it('nunca deja un bloque vacío aunque una intervención sea muy larga', () => {
    const turns = [turn('a b c d e f g h'), turn('i')];
    expect(chunkTurns(turns, 3)).toEqual([[0], [1]]);
  });
});

describe('assignTimings', () => {
  it('reparte la duración de cada bloque y los tiempos son crecientes', () => {
    const turns = [turn('hola qué tal'), turn('muy bien, gracias por preguntar', 'guest'), turn('adiós')];
    const timed = assignTimings(turns, [[0, 1], [2]], [0, 10], [9.5, 3]);
    expect(timed[0].start).toBe(0);
    expect(timed[1].end).toBeCloseTo(9.5, 1);
    expect(timed[2].start).toBe(10);
    expect(timed[2].end).toBe(13);
    expect(timed[1].start!).toBeGreaterThan(timed[0].start!);
    // la intervención más larga dura más
    expect(timed[1].end! - timed[1].start!).toBeGreaterThan(timed[0].end! - timed[0].start!);
  });
});

describe('waveformPeaks y encodeMp3', () => {
  const sine = { sampleRate: 24000, samples: Int16Array.from({ length: 24000 }, (_, i) => Math.round(Math.sin(i / 10) * 12000 * (i / 24000))) };

  it('normaliza los picos entre 0 y 1', () => {
    const peaks = waveformPeaks(sine, 20);
    expect(peaks).toHaveLength(20);
    expect(Math.max(...peaks)).toBe(1);
    expect(peaks[0]).toBeLessThan(peaks[19]);
  });

  it('genera un MP3 válido y mucho más pequeño que el WAV', () => {
    const mp3 = encodeMp3(sine);
    expect(mp3.length).toBeGreaterThan(1000);
    expect(mp3.length).toBeLessThan(sine.samples.length * 2);
    // Cabecera de trama MPEG: 11 bits de sincronización a 1
    expect(mp3[0]).toBe(0xff);
    expect(mp3[1] & 0xe0).toBe(0xe0);
  });
});
