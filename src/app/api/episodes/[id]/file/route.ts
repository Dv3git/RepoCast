import { NextResponse } from 'next/server';
import { apiError } from '@/lib/api';
import { getEpisodeById, getEpisodeInternals } from '@/lib/episodes';
import { getFileText } from '@/lib/github';
import { highlight } from '@/lib/highlight';
import { languageFor } from '@/lib/select-files';
import { loadSnapshot } from '@/lib/snapshot';

const MAX_LINES = 1500;

// Devuelve un fichero (o su diff, en los episodios de novedades) ya resaltado.
export async function GET(request: Request, ctx: RouteContext<'/api/episodes/[id]/file'>) {
  const { id } = await ctx.params;
  const url = new URL(request.url);
  const path = url.searchParams.get('path') ?? '';
  const from = Number(url.searchParams.get('from')) || undefined;
  const to = Number(url.searchParams.get('to')) || from;

  try {
    const [episode, { snapshotPath }] = await Promise.all([getEpisodeById(id), getEpisodeInternals(id)]);
    if (!episode || !snapshotPath) return NextResponse.json({ error: 'No disponible todavía.' }, { status: 404 });
    const snapshot = await loadSnapshot(snapshotPath);
    const githubUrl = `https://github.com/${episode.owner}/${episode.repo}/blob/${episode.sha}/${path}${from ? `#L${from}-L${to}` : ''}`;

    if (snapshot.kind === 'changes') {
      const file = snapshot.files.find((f) => f.path === path);
      if (!file) return NextResponse.json({ error: 'Ese fichero no cambió en esta versión.' }, { status: 404 });
      const html = file.patch ? await highlight(file.patch, 'diff') : null;
      return NextResponse.json(
        { path, kind: 'diff', html, status: file.status, additions: file.additions, deletions: file.deletions, githubUrl },
        { headers: { 'Cache-Control': 'public, max-age=3600' } },
      );
    }

    let content = snapshot.files.find((f) => f.path === path)?.content ?? null;
    if (content === null && snapshot.tree.includes(path)) {
      content = await getFileText(episode.owner, episode.repo, episode.sha, path);
    }
    if (content === null) return NextResponse.json({ error: 'No puedo mostrar ese fichero (binario, muy grande o inexistente).' }, { status: 404 });

    const lines = content.split('\n');
    const clipped = lines.slice(0, MAX_LINES).join('\n');
    const html = await highlight(clipped, languageFor(path), { from, to });
    return NextResponse.json(
      { path, kind: 'file', html, totalLines: lines.length, clipped: lines.length > MAX_LINES, githubUrl },
      { headers: { 'Cache-Control': 'public, max-age=3600' } },
    );
  } catch (err) {
    return apiError(err);
  }
}
