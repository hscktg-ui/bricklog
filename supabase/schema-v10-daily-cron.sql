-- BRICLOG Daily develop loop snapshots (schema-v6-feedback-learning.sql 이후)

create table if not exists public.daily_usage_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_date date not null,
  metrics jsonb not null default '{}'::jsonb,
  pipeline_version text not null default '1',
  ran_at timestamptz not null default now()
);

create unique index if not exists daily_usage_snapshots_date_uidx
  on public.daily_usage_snapshots (snapshot_date);

create index if not exists daily_usage_snapshots_ran_at_idx
  on public.daily_usage_snapshots (ran_at desc);

alter table public.daily_usage_snapshots enable row level security;
-- authenticated 정책 없음 — cron·admin API는 service role 사용

comment on table public.daily_usage_snapshots is
  'KST calendar-day usage aggregates for nightly engine improvement loop (no PII in metrics).';
