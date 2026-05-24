-- BRICLOG Multi-layer personalization (schema-v6-feedback-learning.sql 이후 실행)
-- 계정(개인) / 브랜드(프로젝트) / 피드백 흔적 — RLS user_id 격리

-- 1. 계정별 글쓰기 특성 (전 브랜드 공통 습관·선호)
create table if not exists public.user_writing_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  traits jsonb not null default '{}'::jsonb,
  style_fingerprint jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create unique index if not exists user_writing_profiles_user_uidx
  on public.user_writing_profiles (user_id);

alter table public.user_writing_profiles enable row level security;

drop policy if exists "Users manage own user_writing_profiles" on public.user_writing_profiles;
create policy "Users manage own user_writing_profiles"
  on public.user_writing_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists user_writing_profiles_updated_at on public.user_writing_profiles;
create trigger user_writing_profiles_updated_at
  before update on public.user_writing_profiles
  for each row execute function public.set_updated_at();

-- brand_learning_profiles.profile jsonb 확장은 앱 레벨 (styleFingerprint, recentContentSummaries 등)
-- content_feedback / content_events 는 v6 기존 테이블 — brand_id 로 프로젝트별 격리
