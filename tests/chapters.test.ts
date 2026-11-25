import { describe, expect, it } from 'vitest';
import { chapterAt, cleanChapters, linkAt, parseTimeParam, timedChapters } from '@/lib/chapters';
import type { ScriptTurn } from '@/lib/types';

const turn = (start: number, end: number): ScriptTurn => ({ speaker: 'host', text: 'hola', files: [], start, end });

describe('cleanChapters', () => {
  it('ordena, quita repetidos y fuera de rango, y empieza en la intervención 0', () => {
    const out = cleanChapters(
      [
        { turn: 5, title: 'Cómo se usa' },
        { turn: 2, title: '  El   estado ' },
        { turn: 2, title: 'Repetido' },
        { turn: 40, title: 'Fuera' },
        { turn: -1, title: 'Negativo' },
        { turn: 7, title: '' },
      ],
      10,
    );
    expect(out).toEqual([
      { turn: 0, title: 'El estado' },
      { turn: 5, title: 'Cómo se usa' },
    ]);
  });

  it('devuelve una lista vacía si no queda nada válido', () => {
    expect(cleanChapters([{ turn: 99, title: 'x' }], 3)).toEqual([]);
  });
});

describe('timedChapters y chapterAt', () => {
  const turns = [turn(0, 10), turn(10, 25), turn(25, 40), turn(40, 60)];
  const chapters = timedChapters(
    [
      { turn: 0, title: 'Intro' },
      { turn: 2, title: 'Código' },
    ],
    turns,
  );

  it('asigna el segundo de inicio de cada capítulo', () => {
    expect(chapters.map((c) => c.start)).toEqual([0, 25]);
  });

  it('encuentra el capítulo que suena', () => {
    expect(chapterAt(chapters, 3)).toBe(0);
    expect(chapterAt(chapters, 25)).toBe(1);
    expect(chapterAt(chapters, 59)).toBe(1);
    expect(chapterAt([], 5)).toBe(-1);
  });

  it('ignora capítulos sin tiempos', () => {
    expect(timedChapters([{ turn: 1, title: 'x' }], [{ speaker: 'host', text: 'a', files: [] }, { speaker: 'guest', text: 'b', files: [] }])).toEqual([]);
    expect(timedChapters(null, turns)).toEqual([]);
  });
});

describe('parseTimeParam', () => {
  it.each([
    ['95', 95],
    ['95s', 95],
    ['1:35', 95],
    ['1m35s', 95],
    ['2m', 120],
    ['12.5', 12.5],
  ])('%s → %s segundos', (input, expected) => {
    expect(parseTimeParam(input)).toBe(expected);
  });

  it.each([null, '', 'abc', '1:75', '-3', 'm'])('rechaza %s', (input) => {
    expect(parseTimeParam(input)).toBeNull();
  });
});

describe('linkAt', () => {
  it('añade ?t= solo si el segundo es mayor que cero', () => {
    expect(linkAt('https://x.dev/e/a', 95.7)).toBe('https://x.dev/e/a?t=95');
    expect(linkAt('https://x.dev/e/a', 0.4)).toBe('https://x.dev/e/a');
  });
});
