import { describe, expect, it } from 'vitest';
import { buildGuideMarkdown, githubLink, type GuideInput } from '@/lib/guide';
import type { OverviewAnalysis } from '@/lib/types';

const analysis: OverviewAnalysis = {
  kind: 'overview',
  title: 'Zustand por dentro',
  tagline: 'Estado global en pocas líneas',
  summary: 'Primer párrafo.\n\nSegundo párrafo.',
  stack: [{ name: 'TypeScript', role: 'Lenguaje | tipado' }],
  modules: [
    { id: 'core', name: 'Núcleo', kind: 'library', description: 'Crea el store.', files: ['src/vanilla.ts'] },
    { id: 'react', name: 'React', kind: 'ui', description: 'El hook.', files: [] },
  ],
  relations: [{ from: 'react', to: 'core', label: 'usa' }],
  tour: [{ title: 'Punto de entrada', file: 'src/index.ts', startLine: 1, endLine: 3, explanation: 'Exporta todo.' }],
  highlights: ['Muy pequeño'],
};

const input: GuideInput = {
  episode: {
    slug: 'zustand-abc123',
    kind: 'overview',
    owner: 'pmndrs',
    repo: 'zustand',
    ref: 'main',
    sha: '0123456789abcdef',
    baseRef: null,
    language: 'es',
    title: 'Zustand por dentro',
    tagline: 'Estado global en pocas líneas',
    compareStats: null,
    chapters: [
      { turn: 0, title: 'Bienvenida' },
      { turn: 1, title: 'El núcleo' },
    ],
    script: [
      { speaker: 'host', text: 'Hola y bienvenidos.', files: [], start: 0, end: 4 },
      { speaker: 'guest', text: 'Hablemos del núcleo.', files: [], start: 4, end: 65 },
    ],
  },
  analysis,
  extras: {
    flow: {
      title: 'Crear un store',
      description: 'De create() al hook.',
      participants: [
        { id: 'App', name: 'Tu app', module: '' },
        { id: 'Core', name: 'Núcleo', module: 'core' },
      ],
      steps: [
        { from: 'App', to: 'Core', label: 'llama a create', kind: 'call', file: 'src/vanilla.ts', startLine: 10, endLine: 20 },
        { from: 'Core', to: 'App', label: 'devuelve el store', kind: 'return' },
      ],
    },
    glossary: [{ term: 'Store', definition: 'Donde vive el estado.' }],
  },
  notes: [
    { id: '2', seconds: 64, text: 'Mirar el middleware', createdAt: '' },
    { id: '1', seconds: 3, text: '', createdAt: '' },
  ],
  excerpts: [{ code: "export * from './vanilla'", lang: 'typescript', firstLine: 1 }],
  origin: 'https://repocast.app',
  generatedAt: '2026-11-24T10:00:00.000Z',
};

describe('buildGuideMarkdown', () => {
  const md = buildGuideMarkdown(input);

  it('incluye cabecera, enlace al episodio y resumen', () => {
    expect(md.startsWith('# Zustand por dentro\n')).toBe(true);
    expect(md).toContain('[Escúchalo en RepoCast](https://repocast.app/e/zustand-abc123)');
    expect(md).toContain('main @ `0123456`');
    expect(md).toContain('Primer párrafo.\n\nSegundo párrafo.');
  });

  it('escapa las barras en las tablas y enlaza los ficheros a GitHub en el commit exacto', () => {
    expect(md).toContain('| TypeScript | Lenguaje \\| tipado |');
    expect(md).toContain('[`src/vanilla.ts`](https://github.com/pmndrs/zustand/blob/0123456789abcdef/src/vanilla.ts)');
    expect(md).toContain('- **React** → **Núcleo**: usa');
  });

  it('incluye el diagrama en Mermaid y los pasos con su código', () => {
    expect(md).toContain('```mermaid\nsequenceDiagram');
    expect(md).toContain('App->>Core: llama a create');
    expect(md).toContain('Core-->>App: devuelve el store');
    expect(md).toContain('1. **Tu app → Núcleo:** llama a create — [`src/vanilla.ts:10-20`]');
  });

  it('incluye la visita guiada con su trozo de código', () => {
    expect(md).toContain('### 1. Punto de entrada');
    expect(md).toContain("```typescript\nexport * from './vanilla'\n```");
  });

  it('incluye glosario, capítulos con enlace al segundo, notas ordenadas y transcripción', () => {
    expect(md).toContain('- **Store:** Donde vive el estado.');
    expect(md).toContain('- [0:04](https://repocast.app/e/zustand-abc123?t=4) El núcleo');
    expect(md.indexOf('_Marcador_')).toBeLessThan(md.indexOf('Mirar el middleware'));
    expect(md).toContain('- [1:04](https://repocast.app/e/zustand-abc123?t=64) Mirar el middleware');
    expect(md).toContain('### El núcleo\n\n**Mateo (0:04):** Hablemos del núcleo.');
  });

  it('usa los títulos en inglés para los episodios en inglés y omite lo que no hay', () => {
    const en = buildGuideMarkdown({ ...input, episode: { ...input.episode, language: 'en', chapters: null }, extras: null, notes: [] });
    expect(en).toContain('## Summary');
    expect(en).toContain('**Emma (0:00):**');
    expect(en).not.toContain('mermaid');
    expect(en).not.toContain('## My notes');
    expect(en).not.toContain('## Podcast chapters');
  });
});

describe('githubLink', () => {
  it('codifica la ruta y añade el rango de líneas', () => {
    expect(githubLink('o', 'r', 'sha', 'docs/mi guía.md', 3, 9)).toBe('https://github.com/o/r/blob/sha/docs/mi%20gu%C3%ADa.md#L3-L9');
    expect(githubLink('o', 'r', 'sha', 'a.ts', 5, 5)).toBe('https://github.com/o/r/blob/sha/a.ts#L5');
  });
});
