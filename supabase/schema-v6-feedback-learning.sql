-- BRICLOG Feedback Learning Loop (schema-v3-memory.sql 이후 실행)

-- 1. 콘텐츠 이벤트 (복사·재작성·저장 등)
create table if not exists public.content_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid references public.brands (id) on delete set null,
  content_item_id uuid references public.content_items (id) on delete set null,
  event_type text not null default '',
  channel text not null default '',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists content_events_user_idx
  on public.content_events (user_id, created_at desc);
create index if not exists content_events_brand_idx
  on public.content_events (brand_id, event_type, created_at desc);
create index if not exists content_events_item_idx
  on public.content_events (content_item_id, created_at desc);

alter table public.content_events enable row level security;
create policy "Users manage own content_events"
  on public.content_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. 콘텐츠 반응 피드백
create table if not exists public.content_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  brand_id uuid references public.brands (id) on delete set null,
  channel text not null default 'blog',
  reaction text not null default 'neutral',
  tags text[] not null default '{}',
  memo text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists content_feedback_item_uidx
  on public.content_feedback (content_item_id);

alter table public.content_feedback enable row level security;
create policy "Users manage own content_feedback"
  on public.content_feedback for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. 성과 피드백 확장 (v3 기존 테이블)
alter table public.content_performance
  add column if not exists comments int not null default 0;
alter table public.content_performance
  add column if not exists phone int not null default 0;
alter table public.content_performance
  add column if not exists reservations int not null default 0;

-- 4. 브랜드 학습 프로필
create table if not exists public.brand_learning_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  profile jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create unique index if not exists brand_learning_profiles_brand_uidx
  on public.brand_learning_profiles (brand_id);

alter table public.brand_learning_profiles enable row level security;
create policy "Users manage own brand_learning_profiles"
  on public.brand_learning_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. 전역 품질 인사이트 (관리자 API·service role만)
create table if not exists public.global_quality_insights (
  id uuid primary key default gen_random_uuid(),
  insight_type text not null default '',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  approved_at timestamptz
);

create index if not exists global_quality_insights_status_idx
  on public.global_quality_insights (status, created_at desc);

alter table public.global_quality_insights enable row level security;
-- authenticated 사용자 정책 없음 — admin API는 service role 사용

drop trigger if exists content_feedback_updated_at on public.content_feedback;
create trigger content_feedback_updated_at
  before update on public.content_feedback
  for each row execute function public.set_updated_at();

drop trigger if exists brand_learning_profiles_updated_at on public.brand_learning_profiles;
create trigger brand_learning_profiles_updated_at
  before update on public.brand_learning_profiles
  for each row execute function public.set_updated_at();
