// Crea (o actualiza) la cuenta demo que se usa en la corrección del TFM.
// Uso: npm run db:seed
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split(/\r?\n/)
    .map((l) => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);

const DEMO = { email: 'demo@repocast.app', password: 'RepoCast-demo-2026' };

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });

const { data: list, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw listError;
const existing = list.users.find((u) => u.email === DEMO.email);

if (existing) {
  const { error } = await supabase.auth.admin.updateUserById(existing.id, { password: DEMO.password, email_confirm: true });
  if (error) throw error;
  console.log(`✅ Cuenta demo actualizada: ${DEMO.email}`);
} else {
  const { error } = await supabase.auth.admin.createUser({ ...DEMO, email_confirm: true });
  if (error) throw error;
  console.log(`✅ Cuenta demo creada: ${DEMO.email}`);
}
