// Guía escrita del repositorio en Markdown: lo mismo que el episodio, pero para leer,
// guardar en el repositorio o imprimir. Función pura: sirve para la descarga y para los tests.
import { linkAt, timedChapters } from '@/lib/chapters';
import { toMermaid } from '@/lib/flow';
import { formatTime } from '@/lib/format';
import { SPEAKERS, type Analysis, type AnalysisExtras, type Language, type Note, type PublicEpisode } from '@/lib/types';

/** Trozo de código que acompaña a una parada de la visita guiada. */
export interface GuideExcerpt {
  code: string;
  /** Lenguaje para el bloque de código ('diff' en los episodios de novedades). */
  lang: string;
  /** Número de la primera línea (0 si no aplica). */
  firstLine: number;
}

export interface GuideInput {
  episode: Pick<
    PublicEpisode,
    'slug' | 'kind' | 'owner' | 'repo' | 'ref' | 'sha' | 'baseRef' | 'language' | 'title' | 'tagline' | 'script' | 'chapters' | 'compareStats'
  >;
  analysis: Analysis;
  extras: AnalysisExtras | null;
  notes: Note[];
  /** Código de cada parada de la visita guiada, en el mismo orden (opcional). */
  excerpts?: (GuideExcerpt | null)[];
  /** Origen de la web (https://…) para los enlaces al episodio. */
  origin: string;
  /** Fecha de generación en ISO. */
  generatedAt: string;
}

const T: Record<Language, Record<string, string>> = {
  es: {
    guide: 'Guía del repositorio',
    repo: 'Repositorio',
    version: 'Versión',
    listen: 'Escúchalo en RepoCast',
    generated: 'Guía generada con RepoCast',
    summary: 'Resumen',
    stack: 'Tecnologías',
    tech: 'Tecnología',
    role: 'Para qué se usa',
    architecture: 'Arquitectura',
    relations: 'Cómo se relacionan',
    files: 'Ficheros',
    flow: 'Flujo principal',
    flowSteps: 'Paso a paso',
    tour: 'Visita guiada por el código',
    changes: 'Novedades',
    commits: 'commits',
    filesChanged: 'ficheros cambiados',
    glossary: 'Glosario',
    highlights: 'Curiosidades',
    chapters: 'Capítulos del podcast',
    notes: 'Mis notas',
    bookmark: 'Marcador',
    transcript: 'Transcripción',
  },
  en: {
    guide: 'Repository guide',
    repo: 'Repository',
    version: 'Version',
    listen: 'Listen on RepoCast',
    generated: 'Guide generated with RepoCast',
    summary: 'Summary',
    stack: 'Tech stack',
    tech: 'Technology',
    role: 'Role',
    architecture: 'Architecture',
    relations: 'How they connect',
    files: 'Files',
    flow: 'Main flow',
    flowSteps: 'Step by step',
    tour: 'Guided code tour',
    changes: 'What changed',
    commits: 'commits',
    filesChanged: 'files changed',
    glossary: 'Glossary',
    highlights: 'Highlights',
    chapters: 'Podcast chapters',
    notes: 'My notes',
    bookmark: 'Bookmark',
    transcript: 'Transcript',
  },
};

export function guideLabels(language: Language) {
  return T[language];
}

export function githubLink(owner: string, repo: string, sha: string, path: string, from?: number, to?: number) {
  const lines = from ? `#L${from}${to && to !== from ? `-L${to}` : ''}` : '';
  return `https://github.com/${owner}/${repo}/blob/${sha}/${path.split('/').map(encodeURIComponent).join('/')}${lines}`;
}

function cell(text: string) {
  return text.replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ');
}

function lineRef(path: string, from?: number, to?: number) {
  return `${path}${from ? `:${from}${to && to !== from ? `-${to}` : ''}` : ''}`;
}

export function guideFileName(slug: string) {
  return `${slug}-guia.md`;
}

const FENCE_LANG: Record<string, string> = { shellscript: 'bash', docker: 'dockerfile', text: '' };

export function buildGuideMarkdown({ episode, analysis, extras, notes, excerpts = [], origin, generatedAt }: GuideInput): string {
  const t = T[episode.language];
  const { owner, repo, sha } = episode;
  const gh = (path: string, from?: number, to?: number) => githubLink(owner, repo, sha, path, from, to);
  const pageUrl = `${origin}/e/${episode.slug}`;
  const out: string[] = [];
  const push = (...lines: string[]) => out.push(...lines);

  push(`# ${episode.title ?? analysis.title}`, '');
  if (episode.tagline ?? analysis.tagline) push(`> ${episode.tagline ?? analysis.tagline}`, '');
  push(
    `- **${t.repo}:** [${owner}/${repo}](https://github.com/${owner}/${repo})`,
    `- **${t.version}:** ${episode.kind === 'changes' ? `${episode.baseRef} → ${episode.ref}` : `${episode.ref} @ \`${sha.slice(0, 7)}\``}`,
    `- 🎧 **[${t.listen}](${pageUrl})**`,
    '',
  );

  push(`## ${t.summary}`, '', ...analysis.summary.split(/\n+/).flatMap((p) => [p.trim(), '']));

  if (analysis.kind === 'overview') {
    if (analysis.stack.length) {
      push(`## ${t.stack}`, '', `| ${t.tech} | ${t.role} |`, '| --- | --- |');
      for (const s of analysis.stack) push(`| ${cell(s.name)} | ${cell(s.role)} |`);
      push('');
    }

    push(`## ${t.architecture}`, '');
    const names = new Map(analysis.modules.map((m) => [m.id, m.name]));
    for (const m of analysis.modules) {
      push(`### ${m.name}`, '', `\`${m.kind}\` · ${m.description}`, '');
      if (m.files.length) push(`${t.files}: ${m.files.map((f) => `[\`${f}\`](${gh(f)})`).join(', ')}`, '');
    }
    if (analysis.relations.length) {
      push(`### ${t.relations}`, '');
      for (const r of analysis.relations) push(`- **${names.get(r.from)}** → **${names.get(r.to)}**: ${r.label}`);
      push('');
    }
  } else {
    push(`## ${t.changes}`, '');
    const st = episode.compareStats;
    if (st) push(`_${st.commits} ${t.commits} · ${st.files} ${t.filesChanged} (+${st.additions} −${st.deletions})_`, '');
    for (const c of analysis.changes) {
      push(`### ${c.title}`, '', `\`${c.impact}\` · ${c.description}`, '');
      if (c.files.length) push(`${t.files}: ${c.files.map((f) => `\`${f}\``).join(', ')}`, '');
    }
  }

  const flow = extras?.flow;
  if (flow) {
    const names = new Map(flow.participants.map((p) => [p.id, p.name]));
    push(`## ${t.flow}: ${flow.title}`, '', flow.description, '', '```mermaid', toMermaid(flow), '```', '', `**${t.flowSteps}**`, '');
    flow.steps.forEach((s, i) => {
      const where = s.file ? ` — [\`${lineRef(s.file, s.startLine, s.endLine)}\`](${gh(s.file, s.startLine, s.endLine)})` : '';
      push(`${i + 1}. **${names.get(s.from)} → ${names.get(s.to)}:** ${s.label}${where}`);
    });
    push('');
  }

  if (analysis.tour.length) {
    push(`## ${t.tour}`, '');
    analysis.tour.forEach((s, i) => {
      push(`### ${i + 1}. ${s.title}`, '', `[\`${lineRef(s.file, s.startLine, s.endLine)}\`](${gh(s.file, s.startLine, s.endLine)})`, '', s.explanation, '');
      const ex = excerpts[i];
      if (ex?.code.trim()) {
        const fence = ex.code.includes('```') ? '~~~~' : '```';
        push(`${fence}${FENCE_LANG[ex.lang] ?? ex.lang}`, ex.code, fence, '');
      }
    });
  }

  if (extras?.glossary.length) {
    push(`## ${t.glossary}`, '');
    for (const g of extras.glossary) push(`- **${g.term}:** ${g.definition}`);
    push('');
  }

  if (analysis.highlights.length) {
    push(`## ${t.highlights}`, '', ...analysis.highlights.map((h) => `- ${h}`), '');
  }

  const turns = episode.script ?? [];
  const chapters = timedChapters(episode.chapters, turns);
  if (chapters.length) {
    push(`## ${t.chapters}`, '');
    for (const c of chapters) push(`- [${formatTime(c.start)}](${linkAt(pageUrl, c.start)}) ${c.title}`);
    push('');
  }

  if (notes.length) {
    push(`## ${t.notes}`, '');
    for (const n of [...notes].sort((a, b) => a.seconds - b.seconds)) {
      push(`- [${formatTime(n.seconds)}](${linkAt(pageUrl, n.seconds)}) ${n.text.trim() ? n.text.trim().replace(/\s*\n\s*/g, ' ') : `_${t.bookmark}_`}`);
    }
    push('');
  }

  if (turns.length) {
    const speakers = SPEAKERS[episode.language];
    const starts = new Map(chapters.map((c) => [c.turn, c.title]));
    push(`## ${t.transcript}`, '');
    turns.forEach((turn, i) => {
      const chapter = starts.get(i);
      if (chapter) push(`### ${chapter}`, '');
      const time = turn.start !== undefined ? ` (${formatTime(turn.start)})` : '';
      push(`**${speakers[turn.speaker].name}${time}:** ${turn.text}`, '');
    });
  }

  push('---', '', `_${t.generated} · ${generatedAt.slice(0, 10)} · ${pageUrl}_`, '');
  return out.join('\n');
}
