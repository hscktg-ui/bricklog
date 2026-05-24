-- BRICLOG: profiles + 닉네임 실시간 확인만 (brands 정책 없음 — v2 다시 실행 금지)
-- Supabase SQL Editor → 이 파일만 붙여넣고 Run

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

alter table public.profiles
  add column if not exists nickname text,
  add column if not exists full_name text not null default '',
  add column if not exists contact_phone text,
  add column if not exists business_name text not null default '',
  add column if not exists job_title text not null default '',
  add column if not exists intended_brand_count smallint check (
    intended_brand_count is null
    or (intended_brand_count >= 1 and intended_brand_count <= 99)
  ),
  add column if not exists company_name text not null default '',
  add column if not exists role_type text not null default '',
  add column if not exists preferred_title text not null default '디렉터님',
  add column if not exists main_brand_name text not null default '',
  add column if not exists main_industry text not null default '',
  add column if not exists brand_count_band text not null default '',
  add column if not exists primary_use_case text not null default '',
  add column if not exists profile_completed_at timestamptz,
  add column if not exists profile_setup_skipped_at timestamptz,
  add column if not exists phone_verified_at timestamptz;

create index if not exists profiles_email_idx on public.profiles (email);

create unique index if not exists profiles_nickname_lower_uidx
  on public.profiles (lower(trim(nickname)))
  where nickname is not null and trim(nickname) <> '';

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

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.check_nickname_available(
  p_nickname text,
  p_exclude_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm text := lower(trim(p_nickname));
  v_count int;
begin
  if v_norm is null or length(v_norm) < 2 then
    return jsonb_build_object('available', false, 'valid', false);
  end if;

  select count(*)::int
  into v_count
  from public.profiles
  where lower(trim(nickname)) = v_norm
    and nickname is not null
    and trim(nickname) <> ''
    and (p_exclude_user_id is null or id <> p_exclude_user_id);

  return jsonb_build_object('available', v_count = 0, 'valid', true);
end;
$$;

revoke all on function public.check_nickname_available(text, uuid) from public;
grant execute on function public.check_nickname_available(text, uuid) to anon, authenticated, service_role;
