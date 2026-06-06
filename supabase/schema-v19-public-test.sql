-- BRICLOG Public Brand Test — 일일 쿼터 영속화 (schema-v19)

create table if not exists public.public_test_runs (
  id uuid primary key default gen_random_uuid(),
  run_date date not null default ((now() at time zone 'Asia/Seoul')::date),
  client_ip text not null,
  session_id text,
  brand_name text,
  region text,
  topic text,
  succeeded boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists public_test_runs_date_ip_idx
  on public.public_test_runs (run_date, client_ip);

create index if not exists public_test_runs_date_session_idx
  on public.public_test_runs (run_date, session_id)
  where session_id is not null and session_id <> '';

alter table public.public_test_runs enable row level security;
