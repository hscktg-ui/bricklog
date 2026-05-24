-- BRICLOG signup personalization (v9 이후)
-- role_type, preferred_title, brand_count_band, primary_use_case, company_name, main_brand_name, main_industry

alter table public.profiles
  add column if not exists company_name text not null default '',
  add column if not exists role_type text not null default '',
  add column if not exists preferred_title text not null default '디렉터님',
  add column if not exists main_brand_name text not null default '',
  add column if not exists main_industry text not null default '',
  add column if not exists brand_count_band text not null default '',
  add column if not exists primary_use_case text not null default '',
  add column if not exists profile_completed_at timestamptz,
  add column if not exists profile_setup_skipped_at timestamptz;

create index if not exists profiles_role_type_idx
  on public.profiles (role_type)
  where trim(role_type) <> '';

create index if not exists profiles_primary_use_case_idx
  on public.profiles (primary_use_case)
  where trim(primary_use_case) <> '';
