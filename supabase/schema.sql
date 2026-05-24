-- BRICLOG: generations 테이블 + RLS
-- Supabase SQL Editor에서 실행하세요.

create table if not exists public.generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_type text not null default '',
  region text not null default '',
  main_keyword text not null default '',
  sub_keywords text not null default '',
  purpose text not null default '',
  tone text not null default '',
  blog text not null default '',
  place text not null default '',
  instagram text not null default '',
  hashtags text not null default '',
  image_prompt text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists generations_user_id_created_at_idx
  on public.generations (user_id, created_at desc);

alter table public.generations enable row level security;

-- 본인 기록만 조회
create policy "Users can view own generations"
  on public.generations
  for select
  using (auth.uid() = user_id);

-- 본인 기록만 저장
create policy "Users can insert own generations"
  on public.generations
  for insert
  with check (auth.uid() = user_id);

-- (선택) 본인 기록만 삭제
create policy "Users can delete own generations"
  on public.generations
  for delete
  using (auth.uid() = user_id);
