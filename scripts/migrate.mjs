// Crea las tablas y los buckets de almacenamiento en Supabase.
// Uso: npm run db:migrate   (lee .env.local)
import { readFileSync, readdirSync } from 'node:fs';
import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);

if (!env.SUPABASE_DB_URL) {
  console.error('Falta SUPABASE_DB_URL en .env.local (Panel de Supabase → Connect → Session pooler).');
  process.exit(1);
}

const client = new pg.Client({ connectionString: env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
await client.connect();
for (const file of readdirSync('supabase/migrations').filter((f) => f.endsWith('.sql')).sort()) {
  await client.query(readFileSync(`supabase/migrations/${file}`, 'utf8'));
  console.log(`✅ ${file}`);
}
await client.end();

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});
const buckets = [
  { name: 'podcasts', public: true, allowedMimeTypes: ['audio/mpeg'], fileSizeLimit: '20MB' },
  { name: 'snapshots', public: false, allowedMimeTypes: ['application/json'], fileSizeLimit: '20MB' },
];
const { data: existing } = await supabase.storage.listBuckets();
for (const b of buckets) {
  if (existing?.some((e) => e.name === b.name)) {
    console.log(`✅ bucket ${b.name} (ya existía)`);
    continue;
  }
  const { error } = await supabase.storage.createBucket(b.name, {
    public: b.public,
    allowedMimeTypes: b.allowedMimeTypes,
    fileSizeLimit: b.fileSizeLimit,
  });
  console.log(error ? `❌ bucket ${b.name}: ${error.message}` : `✅ bucket ${b.name}`);
}
