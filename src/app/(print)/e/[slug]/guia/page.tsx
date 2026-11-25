import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { SequenceDiagram } from '@/components/episode/SequenceDiagram';
import { linkAt, timedChapters } from '@/lib/chapters';
import { getEpisodeBySlug } from '@/lib/episodes';
import { formatTime } from '@/lib/format';
import { githubLink, guideLabels, type GuideExcerpt } from '@/lib/guide';
import { getGuideData } from '@/lib/guide-data';
import { getCurrentUser } from '@/lib/supabase/server';
import { SPEAKERS } from '@/lib/types';
import { PrintButton } from './PrintButton';

export async function generateMetadata({ params }: PageProps<'/e/[slug]/guia'>): Promise<Metadata> {
  const { slug } = await params;
  const episode = await getEpisodeBySlug(slug);
  if (!episode) return { title: 'Guía no encontrada' };
  return { title: `Guía · ${episode.title ?? `${episode.owner}/${episode.repo}`}`, description: episode.tagline ?? undefined };
}

function Excerpt({ excerpt }: { excerpt: GuideExcerpt }) {
  const lines = excerpt.code.split('\n');
  return (
    <pre className="mt-3 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 py-2 font-mono text-[11.5px] leading-relaxed text-zinc-800 print:whitespace-pre-wrap">
      {lines.map((line, i) => (
        <div key={i} className="flex">
          {excerpt.firstLine > 0 && <span className="w-10 shrink-0 pr-3 text-right text-zinc-400 select-none">{excerpt.firstLine + i}</span>}
          <code className={`pr-3 ${excerpt.lang === 'diff' ? (line.startsWith('+') ? 'text-emerald-700' : line.startsWith('-') ? 'text-rose-700' : '') : ''} ${excerpt.firstLine > 0 ? '' : 'pl-3'}`}>
            {line || ' '}
          </code>
        </div>
      ))}
    </pre>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 border-b border-zinc-200 pb-1.5 text-xl font-semibold text-zinc-900 print:break-after-avoid">{children}</h2>;
}

async function Guide({ params }: { params: PageProps<'/e/[slug]/guia'>['params'] }) {
  const { slug } = await params;
  const [episode, user] = await Promise.all([getEpisodeBySlug(slug), getCurrentUser()]);
  if (!episode) notFound();
  const data = await getGuideData(episode.id, user?.id ?? null);
  if (!data) {
    return (
      <p className="text-zinc-700">
        La guía estará lista cuando termine de generarse el episodio. <Link href={`/e/${slug}`} className="text-violet-700 underline">Volver al episodio</Link>
      </p>
    );
  }

  const { analysis, extras, notes, excerpts } = data;
  const ep = data.episode;
  const t = guideLabels(ep.language);
  const gh = (path: string, from?: number, to?: number) => githubLink(ep.owner, ep.repo, ep.sha, path, from, to);
  const pageUrl = `/e/${ep.slug}`;
  const turns = ep.script ?? [];
  const chapters = timedChapters(ep.chapters, turns);
  const chapterTitles = new Map(chapters.map((c) => [c.turn, c.title]));
  const speakers = SPEAKERS[ep.language];
  const flow = extras?.flow;

  return (
    <article lang={ep.language} className="text-[14.5px] leading-relaxed text-zinc-700">
      <p className="text-xs font-semibold tracking-wider text-violet-700 uppercase">RepoCast · {t.guide}</p>
      <h1 className="mt-2 text-3xl font-bold text-balance text-zinc-900">{ep.title ?? analysis.title}</h1>
      {(ep.tagline ?? analysis.tagline) && <p className="mt-2 text-lg text-zinc-600">{ep.tagline ?? analysis.tagline}</p>}
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <div>
          <dt className="inline font-medium text-zinc-900">{t.repo}: </dt>
          <dd className="inline">
            <a href={`https://github.com/${ep.owner}/${ep.repo}`} className="text-violet-700 underline">
              {ep.owner}/{ep.repo}
            </a>
          </dd>
        </div>
        <div>
          <dt className="inline font-medium text-zinc-900">{t.version}: </dt>
          <dd className="inline font-mono text-[13px]">{ep.kind === 'changes' ? `${ep.baseRef} → ${ep.ref}` : `${ep.ref} @ ${ep.sha.slice(0, 7)}`}</dd>
        </div>
        <div>
          <a href={pageUrl} className="text-violet-700 underline">
            🎧 {t.listen}
          </a>
        </div>
      </dl>

      <H2>{t.summary}</H2>
      {analysis.summary.split(/\n+/).map((p, i) => (
        <p key={i} className="mt-3">
          {p}
        </p>
      ))}

      {analysis.kind === 'overview' ? (
        <>
          {analysis.stack.length > 0 && (
            <>
              <H2>{t.stack}</H2>
              <table className="mt-3 w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-zinc-300 text-left text-zinc-900">
                    <th className="py-1.5 pr-4 font-semibold">{t.tech}</th>
                    <th className="py-1.5 font-semibold">{t.role}</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.stack.map((s) => (
                    <tr key={s.name} className="border-b border-zinc-100 align-top">
                      <td className="py-1.5 pr-4 font-medium whitespace-nowrap text-zinc-900">{s.name}</td>
                      <td className="py-1.5">{s.role}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          <H2>{t.architecture}</H2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 print:grid-cols-2">
            {analysis.modules.map((m) => (
              <section key={m.id} className="rounded-lg border border-zinc-200 p-3 print:break-inside-avoid">
                <h3 className="font-semibold text-zinc-900">
                  {m.name} <span className="ml-1 rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[11px] font-normal text-violet-700">{m.kind}</span>
                </h3>
                <p className="mt-1 text-sm">{m.description}</p>
                {m.files.length > 0 && (
                  <ul className="mt-2 space-y-0.5 font-mono text-[11.5px]">
                    {m.files.map((f) => (
                      <li key={f}>
                        <a href={gh(f)} className="break-all text-violet-700">
                          {f}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
          {analysis.relations.length > 0 && (
            <>
              <h3 className="mt-5 font-semibold text-zinc-900">{t.relations}</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {analysis.relations.map((r, i) => (
                  <li key={i}>
                    <strong className="text-zinc-900">{analysis.modules.find((m) => m.id === r.from)?.name}</strong> →{' '}
                    <strong className="text-zinc-900">{analysis.modules.find((m) => m.id === r.to)?.name}</strong>: {r.label}
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      ) : (
        <>
          <H2>{t.changes}</H2>
          {ep.compareStats && (
            <p className="mt-2 text-sm text-zinc-500">
              {ep.compareStats.commits} {t.commits} · {ep.compareStats.files} {t.filesChanged} (+{ep.compareStats.additions} −{ep.compareStats.deletions})
            </p>
          )}
          {analysis.changes.map((c, i) => (
            <section key={i} className="mt-4 print:break-inside-avoid">
              <h3 className="font-semibold text-zinc-900">
                {c.title} <span className="ml-1 rounded bg-violet-50 px-1.5 py-0.5 font-mono text-[11px] font-normal text-violet-700">{c.impact}</span>
              </h3>
              <p className="mt-1">{c.description}</p>
              {c.files.length > 0 && <p className="mt-1 font-mono text-[11.5px] break-all text-zinc-500">{c.files.join(' · ')}</p>}
            </section>
          ))}
        </>
      )}

      {flow && (
        <section className="print:break-inside-avoid">
          <H2>
            {t.flow}: {flow.title}
          </H2>
          <p className="mt-3">{flow.description}</p>
          <div className="mt-4 overflow-x-auto print:overflow-visible">
            <SequenceDiagram flow={flow} theme="light" />
          </div>
          <ol className="mt-4 list-decimal space-y-1 pl-5 text-sm">
            {flow.steps.map((s, i) => (
              <li key={i}>
                <strong className="text-zinc-900">
                  {flow.participants.find((p) => p.id === s.from)?.name} → {flow.participants.find((p) => p.id === s.to)?.name}:
                </strong>{' '}
                {s.label}
                {s.file && (
                  <>
                    {' '}
                    —{' '}
                    <a href={gh(s.file, s.startLine, s.endLine)} className="font-mono text-[12px] break-all text-violet-700">
                      {s.file}
                      {s.startLine ? `:${s.startLine}` : ''}
                    </a>
                  </>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {analysis.tour.length > 0 && (
        <>
          <H2>{t.tour}</H2>
          {analysis.tour.map((s, i) => {
            const excerpt = excerpts[i];
            return (
              <section key={i} className="mt-5 print:break-inside-avoid">
                <h3 className="font-semibold text-zinc-900">
                  {i + 1}. {s.title}
                </h3>
                <a href={gh(s.file, s.startLine, s.endLine)} className="font-mono text-[12px] break-all text-violet-700">
                  {s.file}
                  {s.startLine ? `:${s.startLine}-${s.endLine}` : ''}
                </a>
                <p className="mt-1.5">{s.explanation}</p>
                {excerpt && excerpt.code.trim() && <Excerpt excerpt={excerpt} />}
              </section>
            );
          })}
        </>
      )}

      {extras && extras.glossary.length > 0 && (
        <>
          <H2>{t.glossary}</H2>
          <dl className="mt-3 space-y-2">
            {extras.glossary.map((g) => (
              <div key={g.term} className="print:break-inside-avoid">
                <dt className="inline font-semibold text-zinc-900">{g.term}: </dt>
                <dd className="inline">{g.definition}</dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {analysis.highlights.length > 0 && (
        <>
          <H2>{t.highlights}</H2>
          <ul className="mt-3 list-disc space-y-1 pl-5">
            {analysis.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </>
      )}

      {chapters.length > 0 && (
        <>
          <H2>{t.chapters}</H2>
          <ul className="mt-3 space-y-1">
            {chapters.map((c) => (
              <li key={c.turn}>
                <a href={linkAt(pageUrl, c.start)} className="font-mono text-violet-700 tabular-nums">
                  {formatTime(c.start)}
                </a>{' '}
                {c.title}
              </li>
            ))}
          </ul>
        </>
      )}

      {notes.length > 0 && (
        <>
          <H2>{t.notes}</H2>
          <ul className="mt-3 space-y-1">
            {notes.map((n) => (
              <li key={n.id}>
                <a href={linkAt(pageUrl, n.seconds)} className="font-mono text-violet-700 tabular-nums">
                  {formatTime(n.seconds)}
                </a>{' '}
                <span className="whitespace-pre-line">{n.text || <em className="text-zinc-500">{t.bookmark}</em>}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      {turns.length > 0 && (
        <>
          <H2>{t.transcript}</H2>
          <div className="mt-3 space-y-2.5">
            {turns.map((turn, i) => (
              <div key={i}>
                {chapterTitles.get(i) && <h3 className="mt-5 mb-1 font-semibold text-zinc-900">{chapterTitles.get(i)}</h3>}
                <p>
                  <strong className={turn.speaker === 'host' ? 'text-violet-700' : 'text-pink-700'}>
                    {speakers[turn.speaker].name}
                    {turn.start !== undefined ? ` (${formatTime(turn.start)})` : ''}:
                  </strong>{' '}
                  {turn.text}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="mt-12 border-t border-zinc-200 pt-3 text-xs text-zinc-400">{t.generated}</p>
    </article>
  );
}

// Guía del repositorio pensada para leer, imprimir o guardar como PDF.
export default function GuidePage({ params }: PageProps<'/e/[slug]/guia'>) {
  return (
    <div className="guide-page min-h-full flex-1 bg-zinc-100 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto max-w-4xl">
        <GuideToolbar params={params} />
        <div className="guide-paper rounded-2xl bg-white p-6 shadow-sm sm:p-10 print:rounded-none print:p-0 print:shadow-none">
          <Suspense
            fallback={
              <div className="space-y-4" aria-live="polite">
                <p className="text-sm text-zinc-500">Preparando la guía…</p>
                <div className="h-8 w-2/3 animate-pulse rounded bg-zinc-200" />
                <div className="h-40 animate-pulse rounded bg-zinc-100" />
              </div>
            }
          >
            <Guide params={params} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

function GuideToolbar({ params }: { params: PageProps<'/e/[slug]/guia'>['params'] }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
      <Suspense fallback={<span />}>
        <BackLink params={params} />
      </Suspense>
      <PrintButton />
    </div>
  );
}

async function BackLink({ params }: { params: PageProps<'/e/[slug]/guia'>['params'] }) {
  const { slug } = await params;
  return (
    <Link href={`/e/${slug}`} className="focus-ring rounded-lg px-2 py-1 text-sm text-zinc-600 hover:text-zinc-900">
      ← Volver al episodio
    </Link>
  );
}
