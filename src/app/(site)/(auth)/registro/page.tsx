import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '../AuthForm';

export const metadata: Metadata = { title: 'Crear cuenta' };

async function Form({ searchParams }: { searchParams: PageProps<'/registro'>['searchParams'] }) {
  const { next } = await searchParams;
  return <AuthForm mode="register" next={typeof next === 'string' ? next : '/nuevo'} />;
}

export default function RegisterPage({ searchParams }: PageProps<'/registro'>) {
  return (
    <div className="flex justify-center px-4 py-16">
      <Suspense fallback={<div className="card h-96 w-full max-w-md animate-pulse" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
