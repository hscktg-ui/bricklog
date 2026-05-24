-- BRICLOG Quality Training (schema-v3-memory.sql 이후 선택 실행)

create table if not exists public.quality_training_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'running',
  options jsonb not null default '{}'::jsonb,
  progress jsonb not null default '{}'::jsonb,
  report jsonb,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists quality_training_runs_user_idx
  on public.quality_training_runs (user_id, started_at desc);

alter table public.quality_training_runs enable row level security;
create policy "Users manage own quality_training_runs"
  on public.quality_training_runs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.quality_training_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.quality_training_runs (id) on delete cascade,
  test_id text not null default '',
  category text not null default '',
  brand_type text not null default '',
  channel text not null default 'blog',
  persona text not null default '',
  emotion_tone text not null default '',
  input_prompt text not null default '',
  generated_content text not null default '',
  first_score numeric,
  final_score numeric,
  rewrite_count int not null default 0,
  fail_reason text,
  pass_or_fail text not null default 'fail',
  created_at timestamptz not null default now()
);

create index if not exists quality_training_results_run_idx
  on public.quality_training_results (run_id, created_at desc);

alter table public.quality_training_results enable row level security;
create policy "Users read own quality_training_results via run"
  on public.quality_training_results for select
  using (
    exists (
      select 1 from public.quality_training_runs r
      where r.id = run_id and r.user_id = auth.uid()
    )
  );

create policy "Users insert own quality_training_results via run"
  on public.quality_training_results for insert
  with check (
    exists (
      select 1 from public.quality_training_runs r
      where r.id = run_id and r.user_id = auth.uid()
    )
  );
