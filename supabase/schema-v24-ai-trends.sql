-- BRICLOG AI Trend Search MVP
-- 공개 트렌드 카탈로그 + 점수 스냅샷 + 소스 시그널

create table if not exists public.trend_items (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  category text not null default 'tools',
  official_url text not null default '',
  logo_url text not null default '',
  trend_score numeric not null default 0,
  change_24h numeric not null default 0,
  change_7d numeric not null default 0,
  status text not null default 'stable',
  why_trending jsonb not null default '[]'::jsonb,
  why_it_matters text not null default '',
  briclog_view text not null default '',
  aliases jsonb not null default '[]'::jsonb,
  keywords jsonb not null default '[]'::jsonb,
  related_slugs jsonb not null default '[]'::jsonb,
  source_config jsonb not null default '{}'::jsonb,
  summary_cache jsonb not null default '{}'::jsonb,
  featured boolean not null default false,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists trend_items_category_idx
  on public.trend_items (category, trend_score desc);

create index if not exists trend_items_featured_idx
  on public.trend_items (featured desc, trend_score desc);

create index if not exists trend_items_updated_idx
  on public.trend_items (updated_at desc);

create table if not exists public.trend_snapshots (
  id uuid primary key default gen_random_uuid(),
  trend_id uuid not null references public.trend_items (id) on delete cascade,
  score numeric not null default 0,
  rank int,
  recorded_at timestamptz not null default now()
);

create index if not exists trend_snapshots_trend_time_idx
  on public.trend_snapshots (trend_id, recorded_at desc);

create index if not exists trend_snapshots_rank_idx
  on public.trend_snapshots (recorded_at desc, rank asc);

create table if not exists public.trend_source_signals (
  id uuid primary key default gen_random_uuid(),
  trend_id uuid not null references public.trend_items (id) on delete cascade,
  source text not null default '',
  metric text not null default '',
  value numeric,
  change numeric,
  payload jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create index if not exists trend_source_signals_trend_time_idx
  on public.trend_source_signals (trend_id, recorded_at desc);

alter table public.trend_items enable row level security;
alter table public.trend_snapshots enable row level security;
alter table public.trend_source_signals enable row level security;

drop policy if exists "Public read visible trend items" on public.trend_items;
create policy "Public read visible trend items"
  on public.trend_items for select
  using (is_hidden = false);

drop policy if exists "Public read trend snapshots" on public.trend_snapshots;
create policy "Public read trend snapshots"
  on public.trend_snapshots for select
  using (
    exists (
      select 1
      from public.trend_items ti
      where ti.id = trend_snapshots.trend_id
        and ti.is_hidden = false
    )
  );

drop policy if exists "Public read trend source signals" on public.trend_source_signals;
create policy "Public read trend source signals"
  on public.trend_source_signals for select
  using (
    exists (
      select 1
      from public.trend_items ti
      where ti.id = trend_source_signals.trend_id
        and ti.is_hidden = false
    )
  );

drop trigger if exists trend_items_updated_at on public.trend_items;
create trigger trend_items_updated_at
  before update on public.trend_items
  for each row execute function public.set_updated_at();
