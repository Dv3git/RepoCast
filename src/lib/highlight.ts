import 'server-only';
import { codeToHtml } from 'shiki';

/**
 * Resalta código con Shiki. Cada línea lleva su número real (data-line) y las del
 * rango [from, to] se marcan con data-hl para destacarlas en la visita guiada.
 */
export async function highlight(code: string, lang: string, opts: { firstLine?: number; from?: number; to?: number } = {}) {
  const first = opts.firstLine ?? 1;
  const render = (language: string) =>
    codeToHtml(code, {
      lang: language,
      theme: 'github-dark-default',
      transformers: [
        {
          line(node, line) {
            const n = line + first - 1;
            node.properties['data-line'] = n;
            if (opts.from && opts.to && n >= opts.from && n <= opts.to) node.properties['data-hl'] = '';
          },
        },
      ],
    });
  try {
    return await render(lang);
  } catch {
    return render('text');
  }
}
