import Link from 'next/link';
import { formatStars, formatTime } from '@/lib/format';
import { STATUS_LABELS, STYLES, type Episode } from '@/lib/types';

function MiniWave({ peaks }: { peaks: number[] | null }) {
  const bars = (peaks ?? Array.from({ length: 48 }, (_, i) => 0.3 + 0.5 * Math.abs(Math.sin(i * 1.7)))).filter((_, i, a) => i % Math.ceil(a.length / 48) === 0);
  return (
    <div className="flex h-8 items-end gap-[2px]" aria-hidden="true">
      {bars.map((p, i) => (
        <span key={i} className="w-[3px] rounded-full bg-gradient-to-t from-brand-500/60 to-pink-500/80" style={{ height: `${Math.max(12, p * 100)}%` }} />
      ))}
    </div>
  );
}

export function EpisodeCard({ episode }: { episode: Episode }) {
  const ready = episode.status === 'ready';
  return (
    <Link
      href={`/e/${episode.slug}`}
      className="card focus-ring group flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:border-ink-600"
    >
      <div className="flex items-center gap-3">
        {episode.repo_meta?.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={episode.repo_meta.avatarUrl} alt="" className="h-9 w-9 rounded-lg bg-ink-800" loading="lazy" />
        ) : (
          <div className="h-9 w-9 rounded-lg bg-ink-800" />
        )}
        <div className="min-w-0">
          <p className="truncate font-mono text-xs text-ink-400">
            {episode.owner}/{episode.repo}
          </p>
          <p className="text-xs text-ink-400">
            {episode.repo_meta ? `★ ${formatStars(episode.repo_meta.stars)}` : ''}
            {episode.kind === 'changes' ? ` · ${episode.base_ref} → ${episode.ref}` : ''}
          </p>
        </div>
      </div>
      <div className="flex-1">
        <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-white">
          {episode.title ?? `${episode.owner}/${episode.repo}`}
        </h3>
        {episode.tagline && <p className="mt-1.5 line-clamp-2 text-sm text-ink-400">{episode.tagline}</p>}
      </div>
      <div className="flex items-end justify-between gap-3">
        <MiniWave peaks={episode.waveform} />
        <div className="shrink-0 text-right text-xs text-ink-400">
          <p>{ready && episode.audio_seconds ? formatTime(episode.audio_seconds) : STATUS_LABELS[episode.status]}</p>
          <p>
            {episode.kind === 'changes' ? 'Novedades' : STYLES[episode.style].label} · {episode.language.toUpperCase()}
          </p>
        </div>
      </div>
    </Link>
  );
}
