-- Admin ops: 접속 현황·방문 집계
alter table public.profiles
  add column if not exists last_seen_at timestamptz;

create index if not exists profiles_last_seen_at_idx
  on public.profiles (last_seen_at desc);

create table if not exists public.site_visits (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  path text,
  referrer text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists site_visits_created_at_idx
  on public.site_visits (created_at desc);

create index if not exists site_visits_session_idx
  on public.site_visits (session_id);

alter table public.site_visits enable row level security;
