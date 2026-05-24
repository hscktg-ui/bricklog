-- BRICLOG Revenue & Usage (schema v5)
-- Supabase SQL Editor에서 v2 이후 실행

-- 구독 플랜 (기본 free, 관리자·서비스 롤로 pro 전환)
create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'brand', 'studio', 'pro')),
  status text not null default 'active' check (status in ('active', 'cancelled', 'past_due')),
  -- 결제 게이트웨이: 토스페이먼츠 (schema-v5c-toss-billing.sql)
  -- payment_provider text,
  -- external_subscription_id text,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_subscriptions_plan_idx
  on public.user_subscriptions (plan);

alter table public.user_subscriptions enable row level security;

create policy "Users read own subscription"
  on public.user_subscriptions for select
  using (auth.uid() = user_id);

-- insert/update는 서버(service role) 또는 관리자 API만 (클라이언트 직접 변경 금지)

-- 월별 사용량 (콘텐츠·이미지 크레딧)
create table if not exists public.usage_monthly (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period_yyyymm text not null,
  content_count int not null default 0 check (content_count >= 0),
  image_count int not null default 0 check (image_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, period_yyyymm)
);

create index if not exists usage_monthly_user_period_idx
  on public.usage_monthly (user_id, period_yyyymm desc);

alter table public.usage_monthly enable row level security;

create policy "Users read own monthly usage"
  on public.usage_monthly for select
  using (auth.uid() = user_id);

-- usage_logs 확장: 이미지 생성 액션
-- (기존 blog_generate 유지)

create or replace function public.set_subscription_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_subscriptions_updated_at on public.user_subscriptions;
create trigger user_subscriptions_updated_at
  before update on public.user_subscriptions
  for each row execute function public.set_subscription_updated_at();

drop trigger if exists usage_monthly_updated_at on public.usage_monthly;
create trigger usage_monthly_updated_at
  before update on public.usage_monthly
  for each row execute function public.set_updated_at();
