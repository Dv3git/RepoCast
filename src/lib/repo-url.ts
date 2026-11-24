// Interpreta lo que el usuario pega: "owner/repo", la URL del repositorio,
// una URL con /tree/<rama> o un clon terminado en .git.

export interface RepoRef {
  owner: string;
  repo: string;
  ref?: string;
}

const NAME = /^[A-Za-z0-9_.-]+$/;

export function parseRepoInput(input: string): RepoRef | null {
  let s = input.trim();
  if (!s) return null;
  s = s.replace(/^git@github\.com:/i, 'https://github.com/');
  s = s.replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '');
  s = s.replace(/[?#].*$/, '').replace(/\/+$/, '');

  const parts = s.split('/');
  if (parts.length < 2) return null;
  const owner = parts[0];
  const repo = parts[1].replace(/\.git$/i, '');
  if (!NAME.test(owner) || !NAME.test(repo) || repo === '.' || repo === '..') return null;

  let ref: string | undefined;
  if ((parts[2] === 'tree' || parts[2] === 'commit') && parts[3]) ref = parts.slice(3).join('/');
  return ref ? { owner, repo, ref } : { owner, repo };
}
