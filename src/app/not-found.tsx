import Link from 'next/link';
import { LogoMark } from '@/components/Logo';

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <LogoMark className="h-14 w-14" />
      <h1 className="mt-6 text-3xl font-semibold">Aquí no suena nada</h1>
      <p className="mt-2 text-ink-400">La página o el episodio que buscas no existe.</p>
      <Link href="/" className="focus-ring brand-gradient mt-6 rounded-xl px-5 py-2.5 text-sm font-semibold text-white">
        Volver al inicio
      </Link>
    </div>
  );
}
