-- BRICLOG Live Trend Engine
-- Hourly score/rank updates, source health, and job run history

alter table public.trend_items
  add column if not exists first_seen_at timestamptz,
  add column if not exists last_seen_at timestamptz,
  add column if not exists last_snapshot_at timestamptz,
  add column if not exists current_rank int,
  add column if not exists previous_rank int,
  add column if not exists rank_movement int not null default 0,
  add column if not exists previous_score_1h numeric not null default 0,
  add column if not exists hourly_change numeric not null default 0,
  add column if not exists hourly_change_percent numeric not null default 0;

create index if not exists trend_items_rank_idx
  on public.trend_items (current_rank asc nulls last, trend_score desc);

create index if not exists trend_items_last_snapshot_idx
  on public.trend_items (last_snapshot_at desc nulls last);

alter table public.trend_snapshots
  add column if not exists change_1h numeric not null default 0,
  add column if not exists change_1h_percent numeric not null default 0,
  add column if not exists status text not null default 'stable';

create index if not exists trend_snapshots_time_rank_idx
  on public.trend_snapshots (recorded_at desc, rank asc);

create table if not exists public.trend_source_status (
  source_name text primary key,
  enabled boolean not null default false,
  last_attempt timestamptz,
  last_success timestamptz,
  last_error text,
  response_time_ms int,
  records_collected int not null default 0,
  hourly_budget int not null default 0,
  hourly_used int not null default 0,
  daily_budget int not null default 0,
  daily_used int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists trend_source_status_updated_idx
  on public.trend_source_status (updated_at desc);

create table if not exists public.trend_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_key text not null unique,
  job_type text not null default 'hourly',
  trigger text not null default 'cron',
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms int,
  bucket_started_at timestamptz not null,
  sources_online int not null default 0,
  sources_total int not null default 0,
  trends_tracked int not null default 0,
  error text,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists trend_job_runs_started_idx
  on public.trend_job_runs (started_at desc);

create index if not exists trend_job_runs_bucket_idx
  on public.trend_job_runs (bucket_started_at desc);

alter table public.trend_source_status enable row level security;
alter table public.trend_job_runs enable row level security;

drop policy if exists "Admin read trend source status" on public.trend_source_status;
create policy "Admin read trend source status"
  on public.trend_source_status for select
  using (auth.role() = 'authenticated');

drop policy if exists "Admin read trend job runs" on public.trend_job_runs;
create policy "Admin read trend job runs"
  on public.trend_job_runs for select
  using (auth.role() = 'authenticated');
