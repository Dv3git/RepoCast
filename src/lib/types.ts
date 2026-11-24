// Tipos compartidos entre servidor y cliente.

export type Kind = 'overview' | 'changes';
export type Language = 'es' | 'en';
export type Duration = 'short' | 'normal' | 'long';
export type Style = 'divulgativo' | 'tecnico' | 'humor';
export type EpisodeStatus = 'queued' | 'ingesting' | 'analyzing' | 'scripting' | 'voicing' | 'ready' | 'failed';

export const LANGUAGES: Record<Language, string> = { es: 'Español', en: 'English' };

export const DURATIONS: Record<Duration, { label: string; minutes: number; words: number }> = {
  short: { label: 'Corto · 1 min', minutes: 1, words: 160 },
  normal: { label: 'Normal · 3 min', minutes: 3, words: 450 },
  long: { label: 'Largo · 6 min', minutes: 6, words: 880 },
};

export const STYLES: Record<Style, { label: string; description: string }> = {
  divulgativo: { label: 'Divulgativo', description: 'Para cualquiera: metáforas y cero jerga.' },
  tecnico: { label: 'Técnico', description: 'Para devs: patrones, decisiones y detalles.' },
  humor: { label: 'Con humor', description: 'Igual de riguroso, pero con chistes.' },
};

export const STATUS_LABELS: Record<EpisodeStatus, string> = {
  queued: 'En cola',
  ingesting: 'Leyendo el repositorio',
  analyzing: 'Analizando la arquitectura',
  scripting: 'Escribiendo el guion',
  voicing: 'Grabando las voces',
  ready: 'Listo',
  failed: 'Ha fallado',
};

export type ModuleKind =
  | 'ui'
  | 'api'
  | 'service'
  | 'data'
  | 'config'
  | 'infra'
  | 'test'
  | 'docs'
  | 'cli'
  | 'library'
  | 'other';

export interface RepoModule {
  id: string;
  name: string;
  kind: ModuleKind;
  description: string;
  files: string[];
}

export interface RepoRelation {
  from: string;
  to: string;
  label: string;
}

export interface TourStep {
  title: string;
  file: string;
  startLine?: number;
  endLine?: number;
  explanation: string;
}

export interface StackItem {
  name: string;
  role: string;
}

export interface OverviewAnalysis {
  kind: 'overview';
  title: string;
  tagline: string;
  summary: string;
  stack: StackItem[];
  modules: RepoModule[];
  relations: RepoRelation[];
  tour: TourStep[];
  highlights: string[];
}

export type ChangeImpact = 'feature' | 'fix' | 'refactor' | 'breaking' | 'docs' | 'deps' | 'other';

export interface HeadlineChange {
  title: string;
  description: string;
  impact: ChangeImpact;
  files: string[];
}

export interface ChangesAnalysis {
  kind: 'changes';
  title: string;
  tagline: string;
  summary: string;
  changes: HeadlineChange[];
  tour: TourStep[];
  highlights: string[];
}

export type Analysis = OverviewAnalysis | ChangesAnalysis;

export type Speaker = 'host' | 'guest';

export interface ScriptTurn {
  speaker: Speaker;
  text: string;
  files: string[];
  /** Segundo en que empieza la intervención dentro del audio. */
  start?: number;
  end?: number;
}

export interface RepoMeta {
  fullName: string;
  description: string | null;
  stars: number;
  language: string | null;
  avatarUrl: string;
  defaultBranch: string;
  htmlUrl: string;
}

export interface CompareStats {
  commits: number;
  files: number;
  additions: number;
  deletions: number;
}

/** Fila de la tabla episodes tal como la usa la app. */
export interface Episode {
  id: string;
  slug: string;
  user_id: string | null;
  kind: Kind;
  owner: string;
  repo: string;
  ref: string;
  sha: string;
  base_ref: string | null;
  base_sha: string;
  language: Language;
  duration: Duration;
  style: Style;
  status: EpisodeStatus;
  status_detail: string | null;
  error: string | null;
  attempts: number;
  repo_meta: RepoMeta | null;
  compare_stats: CompareStats | null;
  analysis_id: string | null;
  title: string | null;
  tagline: string | null;
  script: ScriptTurn[] | null;
  audio_path: string | null;
  audio_seconds: number | null;
  waveform: number[] | null;
  featured: boolean;
  plays: number;
  created_at: string;
  updated_at: string;
}

/** Lo que el navegador necesita para pintar un episodio. */
export interface PublicEpisode {
  id: string;
  slug: string;
  kind: Kind;
  owner: string;
  repo: string;
  ref: string;
  sha: string;
  baseRef: string | null;
  language: Language;
  duration: Duration;
  style: Style;
  status: EpisodeStatus;
  statusDetail: string | null;
  error: string | null;
  repoMeta: RepoMeta | null;
  compareStats: CompareStats | null;
  title: string | null;
  tagline: string | null;
  script: ScriptTurn[] | null;
  audioUrl: string | null;
  audioSeconds: number | null;
  waveform: number[] | null;
  createdAt: string;
  isOwner: boolean;
}

export const SPEAKERS: Record<Language, Record<Speaker, { name: string; voice: string }>> = {
  es: { host: { name: 'Lucía', voice: 'Kore' }, guest: { name: 'Mateo', voice: 'Puck' } },
  en: { host: { name: 'Emma', voice: 'Kore' }, guest: { name: 'Leo', voice: 'Puck' } },
};
