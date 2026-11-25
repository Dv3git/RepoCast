import { describe, expect, it } from 'vitest';
import { cleanFlow, toMermaid } from '@/lib/flow';
import type { SequenceFlow } from '@/lib/types';

const ctx = {
  paths: new Set(['src/index.ts', 'src/store.ts', 'README.md']),
  visible: new Map([
    ['src/index.ts', 30],
    ['src/store.ts', 200],
  ]),
  moduleIds: new Set(['core', 'react']),
};

const raw: SequenceFlow = {
  title: 'Cómo se crea un store',
  description: 'Desde la llamada a create() hasta la suscripción.',
  participants: [
    { id: 'User', name: 'Tu app', module: '' },
    { id: 'Store Core', name: 'Núcleo', module: 'core' },
    { id: 'react', name: 'Hook de React', module: 'react' },
    { id: 'Unused', name: 'Nadie', module: 'inventado' },
    { id: 'User', name: 'Duplicado', module: '' },
  ],
  steps: [
    { from: 'User', to: 'Store Core', label: 'llama a create(): estado inicial', kind: 'call', file: 'src/store.ts', startLine: 150, endLine: 400 },
    { from: 'Store Core', to: 'react', label: 'expone el hook', kind: 'call', file: 'src/inventado.ts', startLine: 1, endLine: 2 },
    { from: 'react', to: 'User', label: 'devuelve el estado; #listo', kind: 'return' },
    { from: 'Fantasma', to: 'User', label: 'paso roto', kind: 'call' },
    { from: 'User', to: 'User', label: '   ', kind: 'call' },
  ],
};

describe('cleanFlow', () => {
  const flow = cleanFlow(raw, ctx);

  it('quita participantes repetidos y sin uso, y deja ids válidos para Mermaid', () => {
    expect(flow?.participants.map((p) => p.id)).toEqual(['User', 'Store_Core', 'react']);
    expect(flow?.participants[1].module).toBe('core');
  });

  it('quita pasos rotos y vacíos, y valida ficheros y líneas', () => {
    expect(flow?.steps).toHaveLength(3);
    expect(flow?.steps[0]).toMatchObject({ from: 'User', to: 'Store_Core', file: 'src/store.ts', startLine: 150, endLine: 200 });
    expect(flow?.steps[1].file).toBeUndefined();
    expect(flow?.steps[2].kind).toBe('return');
  });

  it('devuelve null si no queda un diagrama con sentido', () => {
    expect(cleanFlow({ ...raw, steps: raw.steps.slice(0, 1) }, ctx)).toBeNull();
  });

  it('genera ids únicos aunque los nombres choquen', () => {
    const out = cleanFlow(
      {
        ...raw,
        participants: [
          { id: 'a b', name: 'A', module: '' },
          { id: 'a-b', name: 'B', module: '' },
          { id: '9x', name: 'C', module: '' },
        ],
        steps: [
          { from: 'a b', to: 'a-b', label: 'uno', kind: 'call' },
          { from: 'a-b', to: '9x', label: 'dos', kind: 'call' },
        ],
      },
      ctx,
    );
    expect(out?.participants.map((p) => p.id)).toEqual(['a_b', 'a_b2', 'P9x']);
  });
});

describe('toMermaid', () => {
  it('produce un diagrama de secuencia sin caracteres que rompan Mermaid', () => {
    const flow = cleanFlow(raw, ctx)!;
    expect(toMermaid(flow)).toBe(
      [
        'sequenceDiagram',
        '  autonumber',
        '  participant User as Tu app',
        '  participant Store_Core as Núcleo',
        '  participant react as Hook de React',
        '  User->>Store_Core: llama a create() - estado inicial',
        '  Store_Core->>react: expone el hook',
        '  react-->>User: devuelve el estado, ,listo',
      ].join('\n'),
    );
  });
});
