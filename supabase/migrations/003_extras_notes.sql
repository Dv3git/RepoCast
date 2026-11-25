-- Capítulos del podcast, extras del análisis (diagrama de flujo y glosario) y notas de los usuarios.

-- Capítulos: [{ "turn": 0, "title": "..." }], donde turn es el índice de la intervención con la que empieza.
alter table public.episodes add column if not exists chapters jsonb;

-- Extras del análisis: { "flow": {...} | null, "glossary": [...] }. Se generan una vez por análisis.
alter table public.analyses add column if not exists extras jsonb;

-- Notas y marcadores que cada usuario pone en un momento del audio. Son privadas.
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  episode_id uuid not null references public.episodes (id) on delete cascade,
  seconds real not null check (seconds >= 0),
  text text not null default '' check (char_length(text) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists notes_user_episode_idx on public.notes (user_id, episode_id, seconds);

alter table public.notes enable row level security;

grant select, insert, update, delete on public.notes to service_role;
revoke all on public.notes from anon, authenticated;
