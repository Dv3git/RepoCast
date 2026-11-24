// Tipos de la base de datos (mismo formato que genera `supabase gen types`).
// Reflejan supabase/migrations/001_schema.sql.

// Las columnas jsonb se validan en la aplicación (zod y tipos de dominio), no aquí.
export type Json = unknown;

type EpisodeRow = {
  id: string;
  slug: string;
  user_id: string | null;
  kind: string;
  owner: string;
  repo: string;
  ref: string;
  sha: string;
  base_ref: string | null;
  base_sha: string;
  language: string;
  duration: string;
  style: string;
  status: string;
  status_detail: string | null;
  error: string | null;
  attempts: number;
  locked_until: string | null;
  snapshot_path: string | null;
  repo_meta: Json | null;
  compare_stats: Json | null;
  analysis_id: string | null;
  title: string | null;
  tagline: string | null;
  script: Json | null;
  audio_path: string | null;
  audio_seconds: number | null;
  waveform: Json | null;
  usage: Json;
  featured: boolean;
  plays: number;
  created_at: string;
  updated_at: string;
};

type AnalysisRow = {
  id: string;
  kind: string;
  owner: string;
  repo: string;
  sha: string;
  base_sha: string;
  language: string;
  snapshot_path: string;
  data: Json;
  usage: Json;
  created_at: string;
};

type UsageEventRow = {
  id: number;
  user_id: string;
  kind: string;
  created_at: string;
};

type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Database = {
  public: {
    Tables: {
      episodes: {
        Row: EpisodeRow;
        Insert: Optional<
          EpisodeRow,
          | 'id'
          | 'user_id'
          | 'base_ref'
          | 'base_sha'
          | 'status'
          | 'status_detail'
          | 'error'
          | 'attempts'
          | 'locked_until'
          | 'snapshot_path'
          | 'repo_meta'
          | 'compare_stats'
          | 'analysis_id'
          | 'title'
          | 'tagline'
          | 'script'
          | 'audio_path'
          | 'audio_seconds'
          | 'waveform'
          | 'usage'
          | 'featured'
          | 'plays'
          | 'created_at'
          | 'updated_at'
        >;
        Update: Partial<EpisodeRow>;
        Relationships: [];
      };
      analyses: {
        Row: AnalysisRow;
        Insert: Optional<AnalysisRow, 'id' | 'base_sha' | 'usage' | 'created_at'>;
        Update: Partial<AnalysisRow>;
        Relationships: [];
      };
      usage_events: {
        Row: UsageEventRow;
        Insert: Optional<UsageEventRow, 'id' | 'created_at'>;
        Update: Partial<UsageEventRow>;
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      increment_plays: { Args: { episode_slug: string }; Returns: undefined };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
