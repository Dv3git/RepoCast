import { describe, expect, it } from 'vitest';
import { parseRepoInput } from '@/lib/repo-url';

describe('parseRepoInput', () => {
  it('acepta owner/repo', () => {
    expect(parseRepoInput('vercel/swr')).toEqual({ owner: 'vercel', repo: 'swr' });
  });

  it('acepta URLs completas, con www, barra final o .git', () => {
    expect(parseRepoInput('https://github.com/vercel/swr')).toEqual({ owner: 'vercel', repo: 'swr' });
    expect(parseRepoInput('http://www.github.com/vercel/swr/')).toEqual({ owner: 'vercel', repo: 'swr' });
    expect(parseRepoInput('https://github.com/vercel/swr.git')).toEqual({ owner: 'vercel', repo: 'swr' });
    expect(parseRepoInput('git@github.com:vercel/swr.git')).toEqual({ owner: 'vercel', repo: 'swr' });
  });

  it('extrae la rama de /tree/...', () => {
    expect(parseRepoInput('https://github.com/vercel/next.js/tree/canary')).toEqual({ owner: 'vercel', repo: 'next.js', ref: 'canary' });
    expect(parseRepoInput('github.com/a/b/tree/feature/login')).toEqual({ owner: 'a', repo: 'b', ref: 'feature/login' });
  });

  it('ignora query y hash', () => {
    expect(parseRepoInput('https://github.com/vercel/swr?tab=readme#install')).toEqual({ owner: 'vercel', repo: 'swr' });
  });

  it('rechaza entradas no válidas', () => {
    expect(parseRepoInput('')).toBeNull();
    expect(parseRepoInput('solo-un-nombre')).toBeNull();
    expect(parseRepoInput('https://github.com/vercel')).toBeNull();
    expect(parseRepoInput('a/<script>')).toBeNull();
    expect(parseRepoInput('a/..')).toBeNull();
  });
});
