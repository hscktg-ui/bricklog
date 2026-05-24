-- BRICLOG Customer data asset layer (schema-v8-personalization.sql 이후 실행)
-- user_id → brand_id → content_items / feedback / events 연결 강화

-- 1. 브랜드별 자산 롤업 (프롬프트·UI용 요약, 원문 미포함)
alter table public.brands
  add column if not exists brand_data_assets jsonb not null default '{}'::jsonb;

comment on column public.brands.brand_data_assets is
  'Per-brand data asset rollup (counts, channels, learning freshness). No raw content.';

-- 2. 자산 이벤트 레지스트리 (감사·집계용, PII 없는 summary만)
create table if not exists public.data_asset_registry (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid references public.brands (id) on delete set null,
  content_item_id uuid references public.content_items (id) on delete set null,
  asset_type text not null default '',
  channel text not null default '',
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists data_asset_registry_user_idx
  on public.data_asset_registry (user_id, created_at desc);
create index if not exists data_asset_registry_brand_idx
  on public.data_asset_registry (brand_id, asset_type, created_at desc);
create index if not exists data_asset_registry_item_idx
  on public.data_asset_registry (content_item_id, created_at desc);

alter table public.data_asset_registry enable row level security;

drop policy if exists "Users manage own data_asset_registry" on public.data_asset_registry;
create policy "Users manage own data_asset_registry"
  on public.data_asset_registry for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. 피드백·성과 조회용 인덱스 (브랜드 단위 자산 집계)
create index if not exists content_feedback_brand_created_idx
  on public.content_feedback (brand_id, created_at desc)
  where brand_id is not null;

create index if not exists content_performance_user_idx
  on public.content_performance (user_id, created_at desc);

create index if not exists brand_learning_profiles_user_idx
  on public.brand_learning_profiles (user_id, updated_at desc);

comment on table public.data_asset_registry is
  'Append-only asset events (generation, feedback). summary is sanitized metadata only.';
