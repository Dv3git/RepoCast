import Link from 'next/link';
import { Suspense } from 'react';
import { EpisodeCard } from '@/components/EpisodeCard';
import { RepoQuickForm } from '@/components/RepoQuickForm';
import { listReadyEpisodes } from '@/lib/episodes';

async function Gallery() {
  const episodes = await listReadyEpisodes(6);
  if (episodes.length === 0) {
    return (
      <p className="card p-8 text-center text-ink-400">
        Todavía no hay podcasts. ¡Sé la primera persona en crear uno!
      </p>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {episodes.map((e) => (
        <EpisodeCard key={e.id} episode={e} />
      ))}
    </div>
  );
}

const STEPS = [
  {
    n: '01',
    title: 'Pega la URL',
    text: 'Cualquier repositorio público de GitHub. Eliges idioma, duración y estilo: divulgativo, técnico o con humor.',
  },
  {
    n: '02',
    title: 'Claude lee el código',
    text: 'Selecciona los ficheros clave, entiende la arquitectura y escribe el guion de un programa con dos presentadores.',
  },
  {
    n: '03',
    title: 'Escucha y explora',
    text: 'Gemini pone las voces. Mientras suena, la transcripción te lleva al mapa de la arquitectura y al código exacto.',
  },
];

const FEATURES = [
  { icon: '🎙️', title: 'Podcast de dos voces', text: 'Lucía pregunta, Mateo explica. De 1 a 6 minutos, en español o inglés.' },
  { icon: '🗺️', title: 'Mapa de la arquitectura', text: 'Módulos y relaciones en un diagrama interactivo. Pulsa un nodo y ve sus ficheros.' },
  { icon: '🧭', title: 'Visita guiada', text: 'El recorrido que haría un dev veterano: de la entrada al flujo principal, con el código resaltado.' },
  { icon: '📝', title: 'Transcripción sincronizada', text: 'Se resalta mientras suena. Pulsa una frase para saltar a ese momento o al fichero que menciona.' },
  { icon: '💬', title: 'Chat con el repositorio', text: '¿Dónde se valida el login? Responde citando ficheros y líneas que puedes abrir con un clic.' },
  { icon: '📰', title: 'Podcast de novedades', text: 'Elige dos versiones y escucha qué ha cambiado entre ellas, como un parte de noticias.' },
];

export default function Home() {
  return (
    <>
      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-20 pb-16 text-center sm:pt-28">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-ink-700 bg-ink-900/70 px-3 py-1 text-xs text-ink-300">
          <span className="onair-dot h-2 w-2 rounded-full bg-onair" /> En el aire: tu repositorio favorito
        </p>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Escucha cualquier repositorio de <span className="text-gradient">GitHub</span> como si fuera un podcast
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-pretty text-ink-300">
          RepoCast lee el código por ti y lo convierte en un programa de dos voces, un mapa interactivo de su arquitectura y una visita
          guiada por los ficheros que importan.
        </p>
        <div className="mt-10 flex w-full justify-center">
          <RepoQuickForm />
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16">
        <h2 className="text-2xl font-semibold sm:text-3xl">Cómo funciona</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card p-6">
              <p className="font-mono text-sm text-brand-400">{s.n}</p>
              <h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-400">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-2xl font-semibold sm:text-3xl">Todo lo que obtienes</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <p className="text-2xl" aria-hidden="true">
                {f.icon}
              </p>
              <h3 className="mt-3 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-400">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="flex items-end justify-between gap-4">
          <h2 className="text-2xl font-semibold sm:text-3xl">Últimos episodios</h2>
          <Link href="/explorar" className="text-sm text-brand-400 hover:underline">
            Ver todos →
          </Link>
        </div>
        <div className="mt-8">
          <Suspense
            fallback={
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="card h-52 animate-pulse" />
                ))}
              </div>
            }
          >
            <Gallery />
          </Suspense>
        </div>
      </section>
    </>
  );
}
