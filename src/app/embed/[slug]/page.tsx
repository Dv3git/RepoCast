import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { EmbedPlayer } from './EmbedPlayer';
import { getEpisodeBySlug, toPublic } from '@/lib/episodes';

export const metadata: Metadata = { robots: { index: false } };

async function Embed({ params }: { params: PageProps<'/embed/[slug]'>['params'] }) {
  const { slug } = await params;
  const episode = await getEpisodeBySlug(slug);
  if (!episode) notFound();
  return <EmbedPlayer episode={toPublic(episode)} />;
}

// Reproductor mínimo para incrustar con <iframe> en otras webs.
export default function EmbedPage({ params }: PageProps<'/embed/[slug]'>) {
  return (
    <Suspense fallback={<div className="h-[152px] animate-pulse rounded-xl bg-ink-900" />}>
      <Embed params={params} />
    </Suspense>
  );
}
