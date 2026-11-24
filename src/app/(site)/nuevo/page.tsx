import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { getQuota } from '@/lib/quota';
import { getCurrentUser } from '@/lib/supabase/server';
import { NewEpisodeForm } from './NewEpisodeForm';

export const metadata: Metadata = { title: 'Nuevo podcast' };

async function FormWithUser({ searchParams }: { searchParams: PageProps<'/nuevo'>['searchParams'] }) {
  const { repo } = await searchParams;
  const initialRepo = typeof repo === 'string' ? repo : '';
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(`/nuevo${initialRepo ? `?repo=${initialRepo}` : ''}`)}`);
  const quota = await getQuota(user.id, 'episode');
  return <NewEpisodeForm initialRepo={initialRepo} quota={quota} />;
}

export default function NewEpisodePage({ searchParams }: PageProps<'/nuevo'>) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-semibold">Nuevo podcast</h1>
      <p className="mt-2 text-ink-400">Elige el repositorio y cómo quieres que suene. Tarda entre uno y tres minutos.</p>
      <div className="mt-8">
        <Suspense fallback={<div className="card h-[560px] animate-pulse" />}>
          <FormWithUser searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
