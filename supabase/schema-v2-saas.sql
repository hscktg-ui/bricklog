-- BRICLOG SaaS MVP schema
-- Supabase 대시보드 → SQL Editor → schema.sql 실행 후 이 파일을 실행하세요.
-- brands 테이블이 없으면 "브랜드를 저장하지 못했습니다" 오류가 납니다.

-- 브랜드 (사용자별 분리)
create table if not exists public.brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_name text not null default '',
  industry text not null default 'flower',
  region text not null default '',
  tone text not null default 'emotional',
  kpi_goal text not null default 'save',
  brand_description text not null default '',
  main_keyword text not null default '',
  sub_keyword text not null default '',
  include_phrases text not null default '',
  forbidden_words text not null default '',
  emoji_density text not null default 'low',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brands_user_id_idx on public.brands (user_id);

alter table public.brands enable row level security;

drop policy if exists "Users manage own brands" on public.brands;
create policy "Users manage own brands"
  on public.brands for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- generations 확장
alter table public.generations
  add column if not exists brand_id uuid references public.brands (id) on delete set null;

alter table public.generations
  add column if not exists full_copy_text text not null default '';

create index if not exists generations_brand_id_idx
  on public.generations (brand_id);

-- OpenAI / 생성 사용량
create table if not exists public.usage_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null default 'blog_generate',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists usage_logs_user_day_idx
  on public.usage_logs (user_id, created_at desc);

alter table public.usage_logs enable row level security;

drop policy if exists "Users view own usage" on public.usage_logs;
create policy "Users view own usage"
  on public.usage_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own usage" on public.usage_logs;
create policy "Users insert own usage"
  on public.usage_logs for insert
  with check (auth.uid() = user_id);

-- 오류 로그 (서버 insert, 관리자 select)
create table if not exists public.error_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  route text not null default '',
  message text not null default '',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists error_logs_created_idx
  on public.error_logs (created_at desc);

alter table public.error_logs enable row level security;

drop policy if exists "Users insert own errors" on public.error_logs;
create policy "Users insert own errors"
  on public.error_logs for insert
  with check (user_id is null or auth.uid() = user_id);

-- error_logs 조회는 서버 service role (관리자 API)만 사용

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists brands_updated_at on public.brands;
create trigger brands_updated_at
  before update on public.brands
  for each row execute function public.set_updated_at();
