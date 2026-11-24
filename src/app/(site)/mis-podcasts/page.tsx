import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { EpisodeCard } from '@/components/EpisodeCard';
import { listUserEpisodes } from '@/lib/episodes';
import { getQuota } from '@/lib/quota';
import { getCurrentUser } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Mis podcasts' };

async function Mine() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar?next=/mis-podcasts');
  const [episodes, quota, chat] = await Promise.all([listUserEpisodes(user.id), getQuota(user.id, 'episode'), getQuota(user.id, 'chat')]);
  return (
    <>
      <p className="mt-2 text-ink-400">
        {user.email} · Hoy te quedan {quota.remaining}/{quota.limit} podcasts nuevos y {chat.remaining}/{chat.limit} preguntas al chat.
      </p>
      <div className="mt-8">
        {episodes.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-ink-300">Aún no has creado ningún podcast.</p>
            <Link href="/nuevo" className="focus-ring brand-gradient mt-4 inline-block rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
              Crear el primero
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {episodes.map((e) => (
              <EpisodeCard key={e.id} episode={e} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function MyEpisodesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Mis podcasts</h1>
      <Suspense fallback={<div className="mt-8 h-52 animate-pulse rounded-2xl bg-ink-900" />}>
        <Mine />
      </Suspense>
    </div>
  );
}
