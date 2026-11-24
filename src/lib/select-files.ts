// Decide qué ficheros de un repositorio leer para que Claude lo entienda,
// sin pasarse del presupuesto de caracteres (y por tanto de coste).

export interface FileCandidate {
  path: string;
  size: number;
}

const IGNORED_DIRS = new Set([
  'node_modules', 'dist', 'build', 'out', '.next', '.nuxt', '.svelte-kit', 'vendor', 'target', 'coverage',
  '.git', '__pycache__', 'venv', '.venv', 'env', 'bin', 'obj', 'third_party', 'third-party', '__snapshots__',
  '.idea', '.vscode', '.cache', 'tmp', '.turbo', 'Pods', 'DerivedData', '.gradle', 'site-packages',
]);

const LOCKFILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'bun.lockb', 'bun.lock', 'poetry.lock', 'Cargo.lock',
  'composer.lock', 'Gemfile.lock', 'go.sum', 'Pipfile.lock', 'uv.lock', 'mix.lock', 'pubspec.lock', 'flake.lock',
]);

const CODE_EXT = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'go', 'rs', 'java', 'kt', 'kts', 'swift', 'rb', 'php', 'cs',
  'c', 'cc', 'cpp', 'h', 'hpp', 'scala', 'ex', 'exs', 'erl', 'clj', 'dart', 'lua', 'sh', 'bash', 'vue', 'svelte',
  'astro', 'sql', 'graphql', 'gql', 'prisma', 'proto', 'html', 'css', 'scss', 'md', 'mdx', 'toml', 'yaml', 'yml',
  'json', 'zig', 'nim', 'jl', 'r', 'hs', 'ml', 'fs', 'tf', 'hcl', 'gradle', 'xml', 'ini', 'cfg',
]);

const MANIFESTS = new Set([
  'package.json', 'pyproject.toml', 'requirements.txt', 'Cargo.toml', 'go.mod', 'pom.xml', 'build.gradle',
  'build.gradle.kts', 'composer.json', 'Gemfile', 'mix.exs', 'pubspec.yaml', 'setup.py', 'deno.json', 'CMakeLists.txt',
]);

const CONFIGS = /^(tsconfig\.json|(vite|next|nuxt|webpack|rollup|astro|svelte|tailwind|vitest|jest)\.config\.[a-z]+|Makefile|Dockerfile|docker-compose\.ya?ml|compose\.ya?ml|vercel\.json|netlify\.toml|\.env\.example)$/;

const ENTRY = /^(main|index|app|server|cli|lib|mod|init|__init__|__main__|program|application|routes|router|api|handler|cmd)\.[a-z]+$/i;

function baseName(path: string) {
  return path.slice(path.lastIndexOf('/') + 1);
}

function extension(path: string) {
  const name = baseName(path);
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** Ficheros que no aportan nada (dependencias, compilados, binarios, lockfiles). */
export function isIgnored(path: string): boolean {
  const segments = path.split('/');
  if (segments.slice(0, -1).some((s) => IGNORED_DIRS.has(s))) return true;
  const name = segments[segments.length - 1];
  if (LOCKFILES.has(name)) return true;
  if (/\.(min|bundle)\.(js|css)$/.test(name) || name.endsWith('.map')) return true;
  if (name === 'Dockerfile' || name === 'Makefile' || MANIFESTS.has(name)) return false;
  return !CODE_EXT.has(extension(path));
}

/** Puntuación: cuanto más alta, antes se lee el fichero. */
export function scoreFile(path: string, size: number): number {
  const name = baseName(path);
  const depth = path.split('/').length - 1;
  const lower = path.toLowerCase();
  let score = 100;

  if (depth === 0 && /^readme(\.[a-z]+)?$/i.test(name)) score += 1000;
  else if (/^readme(\.[a-z]+)?$/i.test(name)) score += 150;
  if (MANIFESTS.has(name)) score += depth === 0 ? 900 : 450;
  if (CONFIGS.test(name)) score += depth === 0 ? 400 : 150;
  if (ENTRY.test(name)) score += 220;
  if (/^(src|lib|app|cmd|pkg|internal|server|core|api)\//.test(lower)) score += 120;

  if (/(^|\/)(tests?|__tests__|spec|e2e|cypress)\//.test(lower) || /\.(test|spec)\.[a-z]+$/.test(lower)) score -= 180;
  if (/(^|\/)(examples?|samples?|demos?|fixtures?|benchmarks?|scripts)\//.test(lower)) score -= 200;
  if (/(^|\/)docs?\//.test(lower)) score -= 120;
  if (/(^|\/)(locales?|i18n|translations)\//.test(lower)) score -= 250;
  if (extension(path) === 'json' && !MANIFESTS.has(name) && !CONFIGS.test(name)) score -= 250;
  if (/^(changelog|license|licence|contributing|code_of_conduct|security)(\.[a-z]+)?$/i.test(name)) score -= 400;

  score -= depth * 25;
  if (size > 60_000) score -= 300;
  else if (size > 25_000) score -= 80;
  if (size < 40) score -= 150;
  return score;
}

export interface Selection {
  /** Rutas en orden de importancia. */
  paths: string[];
  /** Árbol filtrado (sin dependencias ni binarios) para mostrar la estructura. */
  tree: string[];
}

/**
 * Elige los ficheros que caben en `budgetChars` (estimando con su tamaño en el árbol),
 * con un máximo de `maxFiles`.
 */
export function selectFiles(entries: FileCandidate[], budgetChars = 170_000, maxFiles = 80): Selection {
  const useful = entries.filter((e) => !isIgnored(e.path));
  const ranked = [...useful].sort((a, b) => scoreFile(b.path, b.size) - scoreFile(a.path, a.size) || a.path.localeCompare(b.path));

  const paths: string[] = [];
  let used = 0;
  for (const e of ranked) {
    if (paths.length >= maxFiles) break;
    const cost = Math.min(e.size, 30_000);
    if (used + cost > budgetChars) continue;
    paths.push(e.path);
    used += cost;
  }

  return { paths, tree: useful.map((e) => e.path).sort() };
}

/** Lenguaje de resaltado de Shiki a partir de la extensión. */
export function languageFor(path: string): string {
  const name = baseName(path);
  if (name === 'Dockerfile') return 'docker';
  if (name === 'Makefile') return 'make';
  const ext = extension(path);
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx', js: 'javascript', jsx: 'jsx', mjs: 'javascript', cjs: 'javascript',
    py: 'python', go: 'go', rs: 'rust', java: 'java', kt: 'kotlin', kts: 'kotlin', swift: 'swift', rb: 'ruby',
    php: 'php', cs: 'csharp', c: 'c', h: 'c', cc: 'cpp', cpp: 'cpp', hpp: 'cpp', scala: 'scala', ex: 'elixir',
    exs: 'elixir', dart: 'dart', lua: 'lua', sh: 'shellscript', bash: 'shellscript', vue: 'vue', svelte: 'svelte',
    astro: 'astro', sql: 'sql', graphql: 'graphql', gql: 'graphql', prisma: 'prisma', proto: 'proto', html: 'html',
    css: 'css', scss: 'scss', md: 'markdown', mdx: 'mdx', toml: 'toml', yaml: 'yaml', yml: 'yaml', json: 'json',
    xml: 'xml', tf: 'hcl', hcl: 'hcl', zig: 'zig', r: 'r', hs: 'haskell', jl: 'julia', ini: 'ini',
  };
  return map[ext] ?? 'text';
}
