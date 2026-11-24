// Genera los episodios de la galería con la cuenta demo, usando el mismo pipeline que la web.
// Uso: npm run gallery
// La galería no gasta el cupo diario de la cuenta demo: se sube el límite solo para este
// proceso y al terminar se borran sus registros de uso.
import type { CreateInput } from '../src/lib/episodes';

process.env.LIMIT_EPISODES_PER_DAY = '1000';
process.env.LIMIT_EPISODES_GLOBAL_PER_DAY = '1000';
const { createEpisode, getEpisodeBySlug } = await import('../src/lib/episodes');
const { listRefs } = await import('../src/lib/github');
const { advanceEpisode } = await import('../src/lib/pipeline');
const { db } = await import('../src/lib/supabase/server');

const DEMO_EMAIL = 'demo@repocast.app';

type Item = Omit<CreateInput, 'repoUrl'> & { repo: string; featured?: boolean; changesFromLatestTags?: boolean };

const ITEMS: Item[] = [
  { repo: 'pmndrs/zustand', kind: 'overview', language: 'es', duration: 'normal', style: 'divulgativo', featured: true },
  { repo: 'sindresorhus/ky', kind: 'overview', language: 'es', duration: 'short', style: 'humor', featured: true },
  { repo: 'pallets/flask', kind: 'overview', language: 'en', duration: 'normal', style: 'tecnico', featured: true },
  { repo: 'vercel/swr', kind: 'overview', language: 'es', duration: 'short', style: 'divulgativo', featured: true },
  { repo: 'expressjs/express', kind: 'overview', language: 'es', duration: 'normal', style: 'tecnico' },
  { repo: 'BurntSushi/ripgrep', kind: 'overview', language: 'en', duration: 'short', style: 'humor' },
  { repo: 'sindresorhus/ky', kind: 'changes', language: 'es', duration: 'normal', style: 'divulgativo', changesFromLatestTags: true, featured: true },
];

const { data: users, error } = await db().auth.admin.listUsers({ perPage: 1000 });
if (error) throw error;
const demo = users.users.find((u) => u.email === DEMO_EMAIL);
if (!demo) throw new Error('No existe la cuenta demo: ejecuta npm run db:seed');

for (const item of ITEMS) {
  const t0 = Date.now();
  const input: CreateInput = { ...item, repoUrl: `https://github.com/${item.repo}` };
  if (item.changesFromLatestTags) {
    const [owner, repo] = item.repo.split('/');
    const refs = await listRefs(owner, repo);
    if (refs.tags.length < 2) throw new Error(`${item.repo} no tiene dos tags`);
    input.ref = refs.tags[0];
    input.baseRef = refs.tags[1];
  }
  const label = `${item.repo} [${item.kind}${input.baseRef ? ` ${input.baseRef}→${input.ref}` : ''}, ${item.language}, ${item.duration}, ${item.style}]`;

  const { slug, reused } = await createEpisode(input, demo.id);
  const episode = await getEpisodeBySlug(slug);
  if (!episode) throw new Error(`No encuentro ${slug}`);

  let status = episode.status;
  while (status !== 'ready' && status !== 'failed') {
    ({ status } = await advanceEpisode(episode.id));
    process.stdout.write(` ${status}`);
  }
  if (item.featured && status === 'ready') await db().from('episodes').update({ featured: true }).eq('id', episode.id);
  console.log(`\n${status === 'ready' ? '✅' : '❌'} ${label} → /e/${slug}${reused ? ' (reutilizado)' : ''} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}

await db().from('usage_events').delete().eq('user_id', demo.id).eq('kind', 'episode');
console.log('Cupo de la cuenta demo restablecido.');
