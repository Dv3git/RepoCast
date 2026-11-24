import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { EpisodeView } from '@/components/episode/EpisodeView';
import { getEpisodeBySlug, getEpisodeInternals, toPublic } from '@/lib/episodes';
import { getCurrentUser } from '@/lib/supabase/server';

export async function generateMetadata({ params }: PageProps<'/e/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const episode = await getEpisodeBySlug(slug);
  if (!episode) return { title: 'Episodio no encontrado' };
  const title = episode.title ?? `${episode.owner}/${episode.repo}`;
  const description = episode.tagline ?? `Podcast sobre el repositorio ${episode.owner}/${episode.repo}`;
  return { title, description, openGraph: { title, description, type: 'music.song' } };
}

async function Episode({ params }: { params: PageProps<'/e/[slug]'>['params'] }) {
  const { slug } = await params;
  const [episode, user] = await Promise.all([getEpisodeBySlug(slug), getCurrentUser()]);
  if (!episode) notFound();
  const { analysis } = await getEpisodeInternals(episode.id);
  return <EpisodeView key={`${episode.id}-${episode.status}`} initial={toPublic(episode, user?.id ?? null)} analysis={analysis} />;
}

export default function EpisodePage({ params }: PageProps<'/e/[slug]'>) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
          <div className="h-24 animate-pulse rounded-2xl bg-ink-900" />
          <div className="h-28 animate-pulse rounded-2xl bg-ink-900" />
          <div className="h-96 animate-pulse rounded-2xl bg-ink-900" />
        </div>
      }
    >
      <Episode params={params} />
    </Suspense>
  );
}
