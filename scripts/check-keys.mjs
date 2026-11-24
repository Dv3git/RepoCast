// Comprueba que las claves de .env.local funcionan, sin mostrarlas nunca.
// Uso: node scripts/check-keys.mjs
import { readFileSync } from 'node:fs';

function loadEnv(path) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    console.error(`No encuentro ${path}. Copia .env.example como .env.local y rellénalo.`);
    process.exit(1);
  }
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return env;
}

const env = loadEnv('.env.local');

async function check(name, vars, fn) {
  const missing = vars.filter((v) => !env[v]);
  if (missing.length) {
    console.log(`⬜ ${name}: falta ${missing.join(', ')}`);
    return;
  }
  try {
    const detail = await fn();
    console.log(`✅ ${name}${detail ? `: ${detail}` : ''}`);
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
  }
}

async function get(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${body.slice(0, 160).replace(/\s+/g, ' ')}`);
  }
  return res.json();
}

await check('Claude (Anthropic)', ['ANTHROPIC_API_KEY'], async () => {
  const data = await get('https://api.anthropic.com/v1/models?limit=20', {
    'x-api-key': env.ANTHROPIC_API_KEY,
    'anthropic-version': '2023-06-01',
  });
  return `${data.data.length} modelos disponibles (${data.data.slice(0, 3).map((m) => m.id).join(', ')}…)`;
});

await check('Gemini (voces)', ['GEMINI_API_KEY'], async () => {
  const data = await get('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000', {
    'x-goog-api-key': env.GEMINI_API_KEY,
  });
  const tts = data.models.map((m) => m.name.replace('models/', '')).filter((n) => n.includes('tts'));
  return tts.length ? `modelos de voz: ${tts.join(', ')}` : 'clave válida, pero no veo modelos de voz (tts)';
});

await check('GitHub', ['GITHUB_TOKEN'], async () => {
  const data = await get('https://api.github.com/rate_limit', {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    'User-Agent': 'repocast-check',
  });
  return `límite de ${data.rate.limit} peticiones/hora (quedan ${data.rate.remaining})`;
});

await check('Supabase (clave pública)', ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'], async () => {
  const url = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
  const data = await get(`${url}/auth/v1/settings`, { apikey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY });
  return `login por email ${data.external?.email ? 'activado' : 'DESACTIVADO'}`;
});

await check('Supabase (clave secreta)', ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SECRET_KEY'], async () => {
  const url = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, '');
  await get(`${url}/auth/v1/admin/users?per_page=1`, { apikey: env.SUPABASE_SECRET_KEY });
  return 'acceso de administrador correcto';
});
