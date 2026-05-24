-- BRICLOG Auth, Profiles, Contents (v2–v6 이후 실행)
-- ⚠️ schema-v2-saas.sql 은 이미 적용됐으면 다시 실행하지 마세요 (brands policy 오류).
-- profiles + 닉네임만 필요하면 → setup-profiles-nickname-safe.sql 만 실행

-- ─── profiles ───────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null default '',
  display_name text not null default '',
  provider text not null default 'email',
  plan text not null default 'FREE' check (plan in ('FREE', 'PRO')),
  role text not null default 'USER' check (role in ('USER', 'ADMIN')),
  terms_agreed_at timestamptz,
  privacy_agreed_at timestamptz,
  marketing_agreed_at timestamptz,
  terms_version text,
  privacy_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_login_at timestamptz
);

create index if not exists profiles_email_idx on public.profiles (email);

alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users insert own profile" on public.profiles;
create policy "Users insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ─── contents (채널별 생성물, user_id 격리) ─────────────────
create table if not exists public.contents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  brand_id uuid references public.brands (id) on delete set null,
  channel text not null default 'blog',
  title text not null default '',
  body text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  generation_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contents_user_idx on public.contents (user_id, created_at desc);
create index if not exists contents_brand_idx on public.contents (brand_id, channel);

alter table public.contents enable row level security;

drop policy if exists "Users manage own contents" on public.contents;
create policy "Users manage own contents"
  on public.contents for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- brand_assets RLS는 schema-v3-memory.sql 에 정의됨 (재확인용 주석)
-- brands RLS는 schema-v2-saas.sql 에 정의됨

-- ─── updated_at ─────────────────────────────────────────────
drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists contents_updated_at on public.contents;
create trigger contents_updated_at
  before update on public.contents
  for each row execute function public.set_updated_at();

-- ─── 신규 auth.users → profiles 행 (약관은 앱에서 별도 기록) ─
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text;
  v_display text;
begin
  v_provider := coalesce(
    new.raw_app_meta_data->>'provider',
    new.raw_user_meta_data->>'provider',
    'email'
  );
  v_display := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    split_part(coalesce(new.email, ''), '@', 1),
    '회원'
  );

  insert into public.profiles (id, email, display_name, provider)
  values (new.id, coalesce(new.email, ''), v_display, v_provider)
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(nullif(excluded.display_name, ''), public.profiles.display_name),
    provider = excluded.provider,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();
