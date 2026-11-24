// Prueba solo la parte de voces (Gemini → WAV → MP3 + tiempos) con un guion de ejemplo.
// Uso: npx tsx --conditions=react-server --env-file=.env.local scripts/smoke-tts.mts [salida.mp3]
import { writeFileSync } from 'node:fs';
import { voiceScript } from '../src/lib/tts';
import type { ScriptTurn } from '../src/lib/types';

const turns: ScriptTurn[] = [
  { speaker: 'host', files: [], text: '¡Bienvenidos a RepoCast! Hoy toca ky, de Sindre Sorhus: un cliente HTTP diminuto sobre fetch. Mateo, ¿qué le falta a fetch para necesitar esto?' },
  { speaker: 'guest', files: ['source/index.ts'], text: 'Pues fetch te devuelve un error quinientos y se queda tan pancho. Ky convierte los códigos que no son doscientos en errores, serializa JSON, reintenta y pone timeouts. Es fetch después de tomarse un café.' },
  { speaker: 'host', files: [], text: 'Me gusta. ¿Y por dónde se entra al código?' },
  { speaker: 'guest', files: ['source/index.ts'], text: 'Por index punto ts. Ahí se crea la función ky con un atajo por cada método, y con create y extend fabricas instancias que fusionan opciones con mucho cariño.' },
  { speaker: 'host', files: [], text: '¿Y quién hace el trabajo sucio?' },
  { speaker: 'guest', files: ['source/core/Ky.ts'], text: 'La clase Ky, en la carpeta core. Monta la petición, ejecuta los hooks y decide si reintentar, incluso leyendo la cabecera Retry-After como un mayordomo obediente.' },
  { speaker: 'host', files: [], text: '¡Disciplina! Explorad el mapa de arquitectura y dejad vuestras preguntas en el chat. ¡Hasta pronto!' },
];

const out = process.argv[2] ?? 'smoke-tts.mp3';
const t0 = Date.now();
const voiced = await voiceScript(turns, 'es', 'humor');
console.log(`⏱  ${((Date.now() - t0) / 1000).toFixed(1)} s · ${voiced.seconds} s de audio · modelos ${voiced.models.join(', ')}`);
writeFileSync(out, voiced.mp3);
console.log(`MP3: ${out} (${(voiced.mp3.length / 1024).toFixed(0)} KB)`);
console.log('Tiempos:', voiced.turns.map((t) => `${t.start}-${t.end}`).join(' | '));
console.log('Onda (10 primeras barras):', voiced.waveform.slice(0, 10).join(', '));
