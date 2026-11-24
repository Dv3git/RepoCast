// Markdown mínimo para las respuestas del chat: párrafos, listas, bloques de código, **negrita** y `código`.
// Se convierte en tokens (no en HTML) para pintarlos con React sin riesgo de inyección.

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'code'; text: string }
  | { type: 'cite'; text: string; path: string; from?: number; to?: number };

export type Block = { type: 'p'; content: Inline[] } | { type: 'ul'; items: Inline[][] } | { type: 'pre'; code: string };

// ruta/al/fichero.ext o ruta/al/fichero.ext:12 o :12-30
const CITATION = /^([\w@.\-/[\]()+]+\.[A-Za-z0-9]+|Dockerfile|Makefile)(?::(\d+)(?:-(\d+))?)?$/;

export function parseCitation(text: string): { path: string; from?: number; to?: number } | null {
  const m = text.trim().match(CITATION);
  if (!m || !m[1].includes('/') && !m[2] && !/\.(ts|tsx|js|jsx|py|go|rs|java|rb|php|cs|md|json|toml|ya?ml|vue|svelte|css|html)$/.test(m[1])) return null;
  return { path: m[1], from: m[2] ? Number(m[2]) : undefined, to: m[3] ? Number(m[3]) : m[2] ? Number(m[2]) : undefined };
}

// ```tsx const a = 1``` → "const a = 1"
function stripFenceLang(code: string) {
  return code.replace(/^(?:jsx?|tsx?|javascript|typescript|py|python|bash|sh|shell|console|json|go|rust|rs|java|kotlin|swift|rb|ruby|php|css|scss|html|sql|ya?ml|toml|c|cpp|cs|csharp|diff|text)\s+(?=\S)/i, '').trim();
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const re = /(\*\*[^*]+\*\*|```[^`]+```|`[^`]+`)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push({ type: 'text', text: text.slice(last, m.index) });
    const token = m[0];
    if (token.startsWith('**')) out.push({ type: 'bold', text: token.slice(2, -2) });
    else if (token.startsWith('```')) out.push({ type: 'code', text: stripFenceLang(token.slice(3, -3)) });
    else {
      const inner = token.slice(1, -1);
      const cite = parseCitation(inner);
      out.push(cite ? { type: 'cite', text: inner, ...cite } : { type: 'code', text: inner });
    }
    last = m.index! + token.length;
  }
  if (last < text.length) out.push({ type: 'text', text: text.slice(last) });
  return out;
}

export function parseMarkdown(md: string): Block[] {
  const blocks: Block[] = [];
  let list: Inline[][] | null = null;
  let para: string[] = [];

  const flushPara = () => {
    if (para.length) blocks.push({ type: 'p', content: parseInline(para.join(' ')) });
    para = [];
  };
  const flushList = () => {
    if (list) blocks.push({ type: 'ul', items: list });
    list = null;
  };

  let fence: string[] | null = null;

  for (const raw of md.split('\n')) {
    const line = raw.trim();
    // Bloques de código: ```lang … ``` en varias líneas, o entero en una sola línea
    if (fence) {
      if (line.startsWith('```')) {
        blocks.push({ type: 'pre', code: fence.join('\n') });
        fence = null;
      } else fence.push(raw.replace(/\s+$/, ''));
      continue;
    }
    const oneLine = line.match(/^```([^`]+)```(.*)$/);
    if (oneLine) {
      flushPara();
      flushList();
      blocks.push({ type: 'pre', code: stripFenceLang(oneLine[1]) });
      if (oneLine[2].trim()) para.push(oneLine[2].trim());
      continue;
    }
    if (line.startsWith('```')) {
      flushPara();
      flushList();
      fence = [];
      continue;
    }
    const item = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (item) {
      flushPara();
      (list ??= []).push(parseInline(item[1]));
    } else if (!line) {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line.replace(/^#+\s*/, ''));
    }
  }
  if (fence?.length) blocks.push({ type: 'pre', code: fence.join('\n') });
  flushPara();
  flushList();
  return blocks;
}
