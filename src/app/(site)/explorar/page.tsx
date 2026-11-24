import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EpisodeCard } from '@/components/EpisodeCard';
import { listReadyEpisodes } from '@/lib/episodes';

export const metadata: Metadata = { title: 'Explorar podcasts' };

async function List() {
  const episodes = await listReadyEpisodes(60);
  if (episodes.length === 0) return <p className="card p-8 text-center text-ink-400">Aún no hay episodios publicados.</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {episodes.map((e) => (
        <EpisodeCard key={e.id} episode={e} />
      ))}
    </div>
  );
}

export default function ExplorePage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Explorar</h1>
      <p className="mt-2 text-ink-400">Todos los episodios generados por la comunidad. Se escuchan sin cuenta y sin límite.</p>
      <div className="mt-8">
        <Suspense fallback={<div className="card h-52 animate-pulse" />}>
          <List />
        </Suspense>
      </div>
    </div>
  );
}
