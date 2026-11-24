import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AuthForm } from '../AuthForm';

export const metadata: Metadata = { title: 'Entrar' };

async function Form({ searchParams }: { searchParams: PageProps<'/entrar'>['searchParams'] }) {
  const { next } = await searchParams;
  return <AuthForm mode="login" next={typeof next === 'string' ? next : '/nuevo'} />;
}

export default function LoginPage({ searchParams }: PageProps<'/entrar'>) {
  return (
    <div className="flex justify-center px-4 py-16">
      <Suspense fallback={<div className="card h-96 w-full max-w-md animate-pulse" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
