import { getEpisodeBySlug } from '@/lib/episodes';

// Insignia SVG para el README de cualquier proyecto: "🎙 RepoCast | Escúchalo · 3 min".
function textWidth(text: string) {
  return Math.round([...text].reduce((w, ch) => w + (/[A-Z]/.test(ch) ? 7.4 : /[ilI.,·:]/.test(ch) ? 3.4 : 6.4), 0));
}

function escapeXml(s: string) {
  return s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!);
}

export async function GET(_request: Request, ctx: RouteContext<'/api/badge/[slug]'>) {
  const { slug } = await ctx.params;
  const episode = await getEpisodeBySlug(slug);
  const minutes = episode?.audio_seconds ? Math.max(1, Math.round(episode.audio_seconds / 60)) : null;
  const en = episode?.language === 'en';
  const right = episode?.status === 'ready' ? `${en ? 'Listen' : 'Escúchalo'}${minutes ? ` · ${minutes} min` : ''}` : en ? 'coming soon' : 'en preparación';
  const left = 'RepoCast';
  const lw = textWidth(left) + 34;
  const rw = textWidth(right) + 20;
  const w = lw + rw;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="22" role="img" aria-label="${escapeXml(`${left}: ${right}`)}">
<linearGradient id="g" x2="0" y2="100%"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-opacity=".12"/></linearGradient>
<linearGradient id="brand" x1="0" x2="1"><stop offset="0" stop-color="#7c3aed"/><stop offset="1" stop-color="#ec4899"/></linearGradient>
<clipPath id="r"><rect width="${w}" height="22" rx="4"/></clipPath>
<g clip-path="url(#r)"><rect width="${lw}" height="22" fill="#18181b"/><rect x="${lw}" width="${rw}" height="22" fill="url(#brand)"/><rect width="${w}" height="22" fill="url(#g)"/></g>
<g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11">
<circle cx="12" cy="11" r="4" fill="#f43f5e"/><circle cx="12" cy="11" r="7" fill="none" stroke="#f43f5e" stroke-opacity=".5"/>
<text x="24" y="15">${left}</text><text x="${lw + 10}" y="15">${escapeXml(right)}</text></g></svg>`;

  return new Response(svg, {
    headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': 'public, max-age=600, s-maxage=600' },
  });
}
