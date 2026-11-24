import { describe, expect, it } from 'vitest';
import { parseCitation, parseInline, parseMarkdown } from '@/lib/mini-markdown';

describe('parseCitation', () => {
  it('reconoce rutas con o sin líneas', () => {
    expect(parseCitation('src/app/page.tsx:12-30')).toEqual({ path: 'src/app/page.tsx', from: 12, to: 30 });
    expect(parseCitation('lib/db.ts:7')).toEqual({ path: 'lib/db.ts', from: 7, to: 7 });
    expect(parseCitation('README.md')).toEqual({ path: 'README.md', from: undefined, to: undefined });
  });

  it('no confunde código con rutas', () => {
    expect(parseCitation('useState()')).toBeNull();
    expect(parseCitation('npm install')).toBeNull();
    expect(parseCitation('props.value')).toBeNull();
  });
});

describe('parseInline', () => {
  it('separa texto, negrita, código y citas', () => {
    expect(parseInline('Mira **esto** en `src/a.ts:3` y usa `fetch`.')).toEqual([
      { type: 'text', text: 'Mira ' },
      { type: 'bold', text: 'esto' },
      { type: 'text', text: ' en ' },
      { type: 'cite', text: 'src/a.ts:3', path: 'src/a.ts', from: 3, to: 3 },
      { type: 'text', text: ' y usa ' },
      { type: 'code', text: 'fetch' },
      { type: 'text', text: '.' },
    ]);
  });

  it('no interpreta HTML: queda como texto', () => {
    expect(parseInline('<img src=x onerror=alert(1)>')).toEqual([{ type: 'text', text: '<img src=x onerror=alert(1)>' }]);
  });
});

describe('parseMarkdown', () => {
  it('agrupa párrafos y listas', () => {
    const blocks = parseMarkdown('Hola\nmundo\n\n- uno\n- dos\n\nFin');
    expect(blocks.map((b) => b.type)).toEqual(['p', 'ul', 'p']);
    expect(blocks[1].type === 'ul' && blocks[1].items).toHaveLength(2);
  });

  it('reconoce bloques de código en varias líneas y en una sola', () => {
    const multi = parseMarkdown('Ejemplo:\n```ts\nconst a = 1;\n  return a;\n```\nFin');
    expect(multi).toEqual([
      { type: 'p', content: [{ type: 'text', text: 'Ejemplo:' }] },
      { type: 'pre', code: 'const a = 1;\n  return a;' },
      { type: 'p', content: [{ type: 'text', text: 'Fin' }] },
    ]);
    expect(parseMarkdown('```jsx const x = create(set) ``` (README.md:36)')[0]).toEqual({ type: 'pre', code: 'const x = create(set)' });
    expect(parseInline('usa ```js foo()``` aquí')[1]).toEqual({ type: 'code', text: 'foo()' });
  });
});

describe('bloques de código sin lenguaje', () => {
  it('no se come la primera palabra del código', () => {
    expect(parseMarkdown('```const a = 1```')[0]).toEqual({ type: 'pre', code: 'const a = 1' });
  });
});
