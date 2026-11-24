// Prueba de extremo a extremo del núcleo (GitHub → Claude → Gemini) sin base de datos.
// Uso: npx tsx --conditions=react-server --env-file=.env.local scripts/smoke-pipeline.mts owner/repo [salida.mp3]
import { writeFileSync } from 'node:fs';
import { analyzeOverview, writeScript } from '../src/lib/claude';
import { getRepoMeta, parseRepoInput, resolveSha } from '../src/lib/github';
import { buildOverviewSnapshot } from '../src/lib/snapshot';
import { voiceScript } from '../src/lib/tts';

const input = process.argv[2] ?? 'sindresorhus/ky';
const out = process.argv[3] ?? 'smoke.mp3';
const parsed = parseRepoInput(input);
if (!parsed) throw new Error('Repo no válido');

const t0 = Date.now();
const lap = (label: string) => console.log(`⏱  ${label}: ${((Date.now() - t0) / 1000).toFixed(1)} s`);

const meta = await getRepoMeta(parsed.owner, parsed.repo);
const sha = await resolveSha(parsed.owner, parsed.repo, meta.defaultBranch);
const snapshot = await buildOverviewSnapshot(parsed.owner, parsed.repo, sha);
lap(`snapshot (${snapshot.files.length} ficheros, ${snapshot.files.reduce((s, f) => s + f.content.length, 0)} caracteres)`);

const { analysis, usage } = await analyzeOverview(snapshot, meta, 'es');
lap('análisis');
console.log('Uso análisis:', usage);
console.log(JSON.stringify({ title: analysis.title, tagline: analysis.tagline, modules: analysis.modules.map((m) => `${m.id} (${m.files.length})`), relations: analysis.relations.length, tour: analysis.tour.map((t) => `${t.file}:${t.startLine}-${t.endLine}`) }, null, 1));

const script = await writeScript({ analysis, meta, language: 'es', duration: 'short', style: 'humor' });
lap('guion');
console.log('Uso guion:', script.usage);
console.log(script.turns.map((t) => `${t.speaker}: ${t.text}`).join('\n'));

const voiced = await voiceScript(script.turns, 'es', 'humor');
lap(`voces (${voiced.seconds} s de audio, modelos ${voiced.models.join(', ')})`);
writeFileSync(out, voiced.mp3);
console.log(`MP3: ${out} (${(voiced.mp3.length / 1024).toFixed(0)} KB)`);
console.log('Tiempos:', voiced.turns.map((t) => `${t.start}-${t.end}`).join(' | '));
