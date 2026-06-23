-- BRICLOG async blog generation jobs (poll across serverless instances)
-- Run after schema-v7-auth-profiles.sql

create table if not exists public.blog_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'running', 'done', 'failed')),
  plan_id text,
  raw_input jsonb not null default '{}'::jsonb,
  result jsonb,
  error_message text,
  running boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_generation_jobs_user_updated_idx
  on public.blog_generation_jobs (user_id, updated_at desc);

comment on table public.blog_generation_jobs is 'Async /api/content/blog job state for client polling';

alter table public.blog_generation_jobs enable row level security;

drop policy if exists blog_generation_jobs_select_own on public.blog_generation_jobs;
create policy blog_generation_jobs_select_own
  on public.blog_generation_jobs for select
  using (auth.uid() = user_id);

drop policy if exists blog_generation_jobs_insert_own on public.blog_generation_jobs;
create policy blog_generation_jobs_insert_own
  on public.blog_generation_jobs for insert
  with check (auth.uid() = user_id);

drop policy if exists blog_generation_jobs_update_own on public.blog_generation_jobs;
create policy blog_generation_jobs_update_own
  on public.blog_generation_jobs for update
  using (auth.uid() = user_id);
