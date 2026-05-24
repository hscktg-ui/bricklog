-- BRICLOG Memory & Growth (schema-v2-saas.sql 이후 실행)

-- 1. 콘텐츠 아이템 (채널별 저장)
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid references public.brands (id) on delete set null,
  channel text not null default 'blog',
  title text not null default '',
  full_content text not null default '',
  hashtags text not null default '',
  persona text not null default '',
  emotion_tone text not null default '',
  prompt_input jsonb not null default '{}'::jsonb,
  quality_score numeric,
  generation_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists content_items_user_idx on public.content_items (user_id, created_at desc);
create index if not exists content_items_brand_idx on public.content_items (brand_id, channel);

alter table public.content_items enable row level security;
create policy "Users manage own content_items"
  on public.content_items for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2. 버전 (v1 생성, v2 수정, v3 AI 재작성)
create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  version_number int not null default 1,
  source text not null default 'generate',
  title text not null default '',
  full_content text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists content_versions_item_idx
  on public.content_versions (content_item_id, version_number desc);

alter table public.content_versions enable row level security;
create policy "Users manage own content_versions"
  on public.content_versions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. 내 템플릿
create table if not exists public.user_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  template_name text not null default '',
  persona text not null default 'auto',
  emotion_tone text not null default 'auto',
  channel text not null default 'blog',
  length_preference text not null default 'medium',
  forbidden_words text not null default '',
  preferred_style text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_templates_user_idx on public.user_templates (user_id);

alter table public.user_templates enable row level security;
create policy "Users manage own templates"
  on public.user_templates for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4. 브랜드 자료
create table if not exists public.brand_assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  file_name text not null default '',
  file_type text not null default 'text',
  extracted_text text not null default '',
  summary text not null default '',
  key_points jsonb not null default '[]'::jsonb,
  uploaded_at timestamptz not null default now()
);

create index if not exists brand_assets_brand_idx on public.brand_assets (brand_id);

alter table public.brand_assets enable row level security;
create policy "Users manage own brand_assets"
  on public.brand_assets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 5. 성과 피드백
create table if not exists public.content_performance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content_item_id uuid not null references public.content_items (id) on delete cascade,
  views int not null default 0,
  clicks int not null default 0,
  inquiries int not null default 0,
  saves int not null default 0,
  reaction text not null default '',
  memo text not null default '',
  ai_feedback text not null default '',
  patterns jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists content_performance_item_uidx
  on public.content_performance (content_item_id);

alter table public.content_performance enable row level security;
create policy "Users manage own performance"
  on public.content_performance for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. 경쟁사·참고 브랜드
create table if not exists public.brand_competitors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid not null references public.brands (id) on delete cascade,
  competitor_name text not null default '',
  website_url text not null default '',
  memo text not null default '',
  observed_keywords text not null default '',
  content_style text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists brand_competitors_brand_idx on public.brand_competitors (brand_id);

alter table public.brand_competitors enable row level security;
create policy "Users manage own competitors"
  on public.brand_competitors for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists user_templates_updated_at on public.user_templates;
create trigger user_templates_updated_at
  before update on public.user_templates
  for each row execute function public.set_updated_at();

drop trigger if exists content_items_updated_at on public.content_items;
create trigger content_items_updated_at
  before update on public.content_items
  for each row execute function public.set_updated_at();

drop trigger if exists content_performance_updated_at on public.content_performance;
create trigger content_performance_updated_at
  before update on public.content_performance
  for each row execute function public.set_updated_at();

drop trigger if exists brand_competitors_updated_at on public.brand_competitors;
create trigger brand_competitors_updated_at
  before update on public.brand_competitors
  for each row execute function public.set_updated_at();
