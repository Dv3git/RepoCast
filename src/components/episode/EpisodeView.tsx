'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useRef, useState } from 'react';
import { formatStars } from '@/lib/format';
import { DURATIONS, LANGUAGES, STYLES, type Analysis, type PublicEpisode } from '@/lib/types';
import { Changes } from './Changes';
import { Chat } from './Chat';
import { CodeDrawer, type FileTarget } from './CodeDrawer';
import { Generating } from './Generating';
import { Player, type PlayerHandle } from './Player';
import { Share } from './Share';
import { Tour } from './Tour';
import { Transcript } from './Transcript';

// React Flow solo funciona en el navegador.
const ArchitectureMap = dynamic(() => import('./ArchitectureMap').then((m) => m.ArchitectureMap), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-xl bg-ink-900" />,
});

type Tab = 'map' | 'changes' | 'tour' | 'chat' | 'share';

export function EpisodeView({ initial, analysis }: { initial: PublicEpisode; analysis: Analysis | null }) {
  const router = useRouter();
  const [episode, setEpisode] = useState(initial);
  const [time, setTime] = useState(0);
  const [following, setFollowing] = useState(true);
  const [file, setFile] = useState<FileTarget | null>(null);
  const [tab, setTab] = useState<Tab>(initial.kind === 'changes' ? 'changes' : 'map');
  const player = useRef<PlayerHandle>(null);

  const turns = useMemo(() => episode.script ?? [], [episode.script]);
  const active = useMemo(() => turns.findIndex((t) => t.start !== undefined && t.end !== undefined && time >= t.start && time < t.end), [turns, time]);
  const activeFiles = active >= 0 ? turns[active].files : [];
  const openFile = useCallback((path: string) => setFile({ path }), []);
  const closeFile = useCallback(() => setFile(null), []);

  const meta = episode.repoMeta;
  const title = episode.title ?? `${episode.owner}/${episode.repo}`;

  const header = (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        {meta?.avatarUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={meta.avatarUrl} alt="" className="h-14 w-14 shrink-0 rounded-xl bg-ink-800" />
        )}
        <div className="min-w-0">
          <a
            href={meta?.htmlUrl ?? `https://github.com/${episode.owner}/${episode.repo}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-sm text-ink-400 hover:text-white"
          >
            {episode.owner}/{episode.repo} ↗
          </a>
          <h1 className="mt-1 text-2xl font-semibold text-balance sm:text-3xl">{title}</h1>
          {episode.tagline && <p className="mt-2 max-w-3xl text-ink-300">{episode.tagline}</p>}
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-ink-300">
            {meta && <span className="rounded-full border border-ink-700 px-2.5 py-1">★ {formatStars(meta.stars)}</span>}
            {meta?.language && <span className="rounded-full border border-ink-700 px-2.5 py-1">{meta.language}</span>}
            <span className="rounded-full border border-ink-700 px-2.5 py-1">
              {episode.kind === 'changes' ? `${episode.baseRef} → ${episode.ref}` : `${episode.ref} @ ${episode.sha.slice(0, 7)}`}
            </span>
            <span className="rounded-full border border-ink-700 px-2.5 py-1">{LANGUAGES[episode.language]}</span>
            <span className="rounded-full border border-ink-700 px-2.5 py-1">{DURATIONS[episode.duration].label}</span>
            <span className="rounded-full border border-ink-700 px-2.5 py-1">{STYLES[episode.style].label}</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (episode.status !== 'ready' || !episode.audioUrl) {
    return (
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-10">
        {header}
        <Generating episode={episode} onUpdate={setEpisode} onDone={() => router.refresh()} />
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    ...(analysis?.kind === 'overview' ? [{ id: 'map' as const, label: '🗺️ Mapa' }] : []),
    ...(analysis?.kind === 'changes' ? [{ id: 'changes' as const, label: '📰 Novedades' }] : []),
    { id: 'tour', label: '🧭 Visita guiada' },
    { id: 'chat', label: '💬 Chat' },
    { id: 'share', label: '🔗 Compartir' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      {header}

      <div className="card sticky top-[4.5rem] z-30 p-4 sm:p-5">
        <Player
          ref={player}
          src={episode.audioUrl}
          duration={episode.audioSeconds}
          waveform={episode.waveform}
          onTime={setTime}
          onFirstPlay={() => void fetch(`/api/episodes/${episode.id}/play`, { method: 'POST' })}
          downloadName={`${episode.slug}.mp3`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="card p-4 sm:p-5" aria-labelledby="transcript-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 id="transcript-title" className="font-semibold">
              Transcripción
            </h2>
            <label className="flex items-center gap-2 text-xs text-ink-400">
              <input type="checkbox" checked={following} onChange={(e) => setFollowing(e.target.checked)} className="accent-brand-500" />
              Seguir el audio
            </label>
          </div>
          <Transcript
            turns={turns}
            language={episode.language}
            active={active}
            following={following}
            onSeek={(s) => player.current?.seek(s)}
            onOpenFile={openFile}
          />
        </section>

        <section className="card min-w-0 p-4 sm:p-5">
          <div role="tablist" aria-label="Secciones del episodio" className="mb-4 flex gap-1 overflow-x-auto">
            {tabs.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`focus-ring shrink-0 rounded-lg px-3 py-2 text-sm transition ${tab === t.id ? 'bg-ink-700 text-white' : 'text-ink-400 hover:text-white'}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div role="tabpanel">
            {tab === 'map' && analysis?.kind === 'overview' && (
              <div className="space-y-5">
                <ArchitectureMap modules={analysis.modules} relations={analysis.relations} activeFiles={activeFiles} onOpenFile={openFile} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <h3 className="text-sm font-semibold text-ink-300">Stack</h3>
                    <ul className="mt-2 space-y-1.5 text-sm">
                      {analysis.stack.map((s) => (
                        <li key={s.name}>
                          <span className="font-medium">{s.name}</span> <span className="text-ink-400">— {s.role}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-ink-300">Curiosidades</h3>
                    <ul className="mt-2 list-disc space-y-1.5 pl-4 text-sm text-ink-300">
                      {analysis.highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {tab === 'changes' && analysis?.kind === 'changes' && <Changes changes={analysis.changes} stats={episode.compareStats} onOpenFile={openFile} />}
            {tab === 'tour' && analysis && <Tour episodeId={episode.id} steps={analysis.tour} />}
            {tab === 'chat' && <Chat episodeId={episode.id} kind={episode.kind} onOpenFile={setFile} slug={episode.slug} />}
            {tab === 'share' && <Share slug={episode.slug} title={title} audioUrl={episode.audioUrl} />}
          </div>
        </section>
      </div>

      {analysis && (
        <section className="card p-5 sm:p-6">
          <h2 className="font-semibold">Resumen</h2>
          <div className="mt-2 space-y-3 text-sm leading-relaxed text-ink-300">
            {analysis.summary.split(/\n+/).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </section>
      )}

      <CodeDrawer episodeId={episode.id} target={file} onClose={closeFile} />
    </div>
  );
}
