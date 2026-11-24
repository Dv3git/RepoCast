import 'server-only';
import { env } from '@/lib/env';
import { assignTimings, chunkTurns, concatPcm, encodeMp3, parseWav, waveformPeaks, type Pcm } from '@/lib/audio';
import { SPEAKERS, type Language, type ScriptTurn, type Style } from '@/lib/types';

// Voces de Gemini. Si el primer modelo agota su cupo (429), se usa el siguiente:
// cada modelo tiene su propio límite diario.
const MODELS = ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'];
const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/interactions';

export class TtsQuotaError extends Error {}

const STYLE_DIRECTION: Record<Language, Record<Style, { host: string; guest: string }>> = {
  es: {
    divulgativo: { host: 'presentadora de radio cercana y curiosa, acento de España', guest: 'experto entusiasta que explica con calma, acento de España' },
    tecnico: { host: 'presentadora de podcast tecnológico, ágil, acento de España', guest: 'ingeniero de software seguro y preciso, acento de España' },
    humor: { host: 'presentadora divertida y con chispa, acento de España', guest: 'experto socarrón que bromea, acento de España' },
  },
  en: {
    divulgativo: { host: 'warm and curious radio host', guest: 'enthusiastic expert explaining calmly' },
    tecnico: { host: 'energetic tech podcast host', guest: 'confident, precise software engineer' },
    humor: { host: 'playful, witty host', guest: 'sarcastic expert who loves jokes' },
  },
};

async function synthesize(turns: ScriptTurn[], language: Language, style: Style): Promise<{ pcm: Pcm; model: string }> {
  const speakers = SPEAKERS[language];
  const direction = STYLE_DIRECTION[language][style];
  const input = turns.map((t) => ({
    type: 'text',
    text: t.text,
    annotations: [{ type: 'speech_metadata', speaker: speakers[t.speaker].name, style: direction[t.speaker] }],
  }));

  let lastError = '';
  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'x-goog-api-key': env.geminiKey, 'content-type': 'application/json' },
        body: JSON.stringify({
          model,
          input,
          response_format: { type: 'audio' },
          generation_config: {
            speech_config: {
              speakers: [
                { speaker: speakers.host.name, voice: speakers.host.voice },
                { speaker: speakers.guest.name, voice: speakers.guest.voice },
              ],
            },
          },
        }),
      });

      if (res.status === 429) {
        lastError = `${model} sin cupo`;
        break; // siguiente modelo
      }
      if (res.status >= 500) {
        lastError = `${model} respondió ${res.status}`;
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      const json = (await res.json()) as {
        error?: { message?: string };
        steps?: { content?: { type: string; data?: string }[] }[];
      };
      if (!res.ok) throw new Error(`Gemini TTS: ${json.error?.message ?? res.status}`);
      const audio = json.steps?.flatMap((s) => s.content ?? []).find((c) => c.type === 'audio' && c.data);
      if (!audio?.data) throw new Error('Gemini no devolvió audio.');
      return { pcm: parseWav(Buffer.from(audio.data, 'base64')), model };
    }
  }
  throw new TtsQuotaError(`Se ha agotado el cupo de voces por hoy (${lastError}). Vuelve a intentarlo más tarde.`);
}

export interface VoicedEpisode {
  mp3: Uint8Array;
  seconds: number;
  turns: ScriptTurn[];
  waveform: number[];
  models: string[];
}

/** Genera el audio completo del episodio: bloques en paralelo (máx. 3), unión y MP3. */
export async function voiceScript(turns: ScriptTurn[], language: Language, style: Style): Promise<VoicedEpisode> {
  const chunks = chunkTurns(turns);
  const results: { pcm: Pcm; model: string }[] = new Array(chunks.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(3, chunks.length) }, async () => {
      while (next < chunks.length) {
        const i = next++;
        results[i] = await synthesize(
          chunks[i].map((k) => turns[k]),
          language,
          style,
        );
      }
    }),
  );

  const { pcm, offsets } = concatPcm(results.map((r) => r.pcm));
  const durations = results.map((r) => r.pcm.samples.length / r.pcm.sampleRate);
  return {
    mp3: encodeMp3(pcm),
    seconds: Math.round((pcm.samples.length / pcm.sampleRate) * 10) / 10,
    turns: assignTimings(turns, chunks, offsets, durations),
    waveform: waveformPeaks(pcm),
    models: [...new Set(results.map((r) => r.model))],
  };
}
