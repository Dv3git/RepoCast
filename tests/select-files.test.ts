import { describe, expect, it } from 'vitest';
import { isIgnored, languageFor, scoreFile, selectFiles } from '@/lib/select-files';

describe('isIgnored', () => {
  it('descarta dependencias, compilados, binarios y lockfiles', () => {
    expect(isIgnored('node_modules/react/index.js')).toBe(true);
    expect(isIgnored('dist/bundle.js')).toBe(true);
    expect(isIgnored('package-lock.json')).toBe(true);
    expect(isIgnored('public/logo.png')).toBe(true);
    expect(isIgnored('assets/app.min.js')).toBe(true);
  });

  it('mantiene código, manifiestos y ficheros sin extensión conocidos', () => {
    expect(isIgnored('src/index.ts')).toBe(false);
    expect(isIgnored('package.json')).toBe(false);
    expect(isIgnored('Dockerfile')).toBe(false);
    expect(isIgnored('cmd/server/main.go')).toBe(false);
  });
});

describe('scoreFile', () => {
  it('prioriza README y manifiestos sobre el resto', () => {
    expect(scoreFile('README.md', 4000)).toBeGreaterThan(scoreFile('package.json', 1000));
    expect(scoreFile('package.json', 1000)).toBeGreaterThan(scoreFile('src/index.ts', 2000));
  });

  it('prefiere el código fuente a los tests y ejemplos', () => {
    expect(scoreFile('src/router.ts', 3000)).toBeGreaterThan(scoreFile('src/router.test.ts', 3000));
    expect(scoreFile('src/router.ts', 3000)).toBeGreaterThan(scoreFile('examples/basic/router.ts', 3000));
  });

  it('penaliza la profundidad y los ficheros enormes', () => {
    expect(scoreFile('src/a.ts', 2000)).toBeGreaterThan(scoreFile('src/x/y/z/a.ts', 2000));
    expect(scoreFile('src/a.ts', 2000)).toBeGreaterThan(scoreFile('src/b.ts', 90_000));
  });
});

describe('selectFiles', () => {
  const entries = [
    { path: 'README.md', size: 3000 },
    { path: 'package.json', size: 800 },
    { path: 'package-lock.json', size: 400_000 },
    { path: 'src/index.ts', size: 1500 },
    { path: 'src/big.ts', size: 200_000 },
    { path: 'node_modules/x/index.js', size: 100 },
    { path: 'test/index.test.ts', size: 1000 },
  ];

  it('respeta el presupuesto y empieza por lo más importante', () => {
    const { paths, tree } = selectFiles(entries, 6000);
    expect(paths[0]).toBe('README.md');
    expect(paths).toContain('package.json');
    expect(paths).not.toContain('package-lock.json');
    expect(paths).not.toContain('node_modules/x/index.js');
    expect(tree).not.toContain('node_modules/x/index.js');
    const used = paths.reduce((s, p) => s + Math.min(entries.find((e) => e.path === p)!.size, 30_000), 0);
    expect(used).toBeLessThanOrEqual(6000);
  });

  it('limita el número de ficheros', () => {
    const many = Array.from({ length: 200 }, (_, i) => ({ path: `src/f${i}.ts`, size: 100 }));
    expect(selectFiles(many, 1_000_000, 50).paths).toHaveLength(50);
  });
});

describe('languageFor', () => {
  it('traduce extensiones al lenguaje de Shiki', () => {
    expect(languageFor('src/App.tsx')).toBe('tsx');
    expect(languageFor('main.py')).toBe('python');
    expect(languageFor('Dockerfile')).toBe('docker');
    expect(languageFor('LICENSE')).toBe('text');
  });
});
