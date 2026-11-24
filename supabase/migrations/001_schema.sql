-- RepoCast: esquema de la base de datos (Supabase / Postgres)
-- Todas las tablas tienen RLS activado y ninguna política pública:
-- solo el servidor (clave secreta) puede leer y escribir.

create extension if not exists pgcrypto;

-- Análisis de un repositorio (o de los cambios entre dos versiones) hechos por Claude.
-- Se reutilizan entre episodios del mismo commit e idioma para no pagar dos veces.
create table if not exists public.analyses (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('overview', 'changes')),
  owner text not null,
  repo text not null,
  sha text not null,
  base_sha text not null default '',
  language text not null check (language in ('es', 'en')),
  snapshot_path text not null,
  data jsonb not null,
  usage jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (kind, owner, repo, sha, base_sha, language)
);

create table if not exists public.episodes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  kind text not null check (kind in ('overview', 'changes')),
  owner text not null,
  repo text not null,
  ref text not null,
  sha text not null,
  base_ref text,
  base_sha text not null default '',
  language text not null check (language in ('es', 'en')),
  duration text not null check (duration in ('short', 'normal', 'long')),
  style text not null check (style in ('divulgativo', 'tecnico', 'humor')),
  status text not null default 'queued'
    check (status in ('queued', 'ingesting', 'analyzing', 'scripting', 'voicing', 'ready', 'failed')),
  status_detail text,
  error text,
  attempts integer not null default 0,
  locked_until timestamptz,
  snapshot_path text,
  repo_meta jsonb,
  compare_stats jsonb,
  analysis_id uuid references public.analyses (id) on delete set null,
  title text,
  tagline text,
  script jsonb,
  audio_path text,
  audio_seconds real,
  waveform jsonb,
  usage jsonb not null default '{}'::jsonb,
  featured boolean not null default false,
  plays integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists episodes_user_idx on public.episodes (user_id, created_at desc);
create index if not exists episodes_ready_idx on public.episodes (status, featured desc, created_at desc);
create index if not exists episodes_cache_idx
  on public.episodes (kind, owner, repo, sha, base_sha, language, duration, style);

-- Registro de uso para los cupos diarios (episodios nuevos y mensajes de chat).
create table if not exists public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('episode', 'chat')),
  created_at timestamptz not null default now()
);

create index if not exists usage_events_user_idx on public.usage_events (user_id, kind, created_at desc);

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists episodes_touch on public.episodes;
create trigger episodes_touch before update on public.episodes
  for each row execute function public.touch_updated_at();

-- Suma una reproducción sin condiciones de carrera.
create or replace function public.increment_plays(episode_slug text) returns void
language sql security definer set search_path = public as $$
  update public.episodes set plays = plays + 1 where slug = episode_slug and status = 'ready';
$$;

alter table public.analyses enable row level security;
alter table public.episodes enable row level security;
alter table public.usage_events enable row level security;

revoke all on function public.increment_plays(text) from public, anon, authenticated;
