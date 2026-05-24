-- 프로필 저장 오류 시 (컬럼 없음) — 이 파일만 실행 (brands / v2 불필요)
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
