-- 회원별 최초 유입 경로 (first-touch) + site_visits ↔ user 연결
alter table public.site_visits
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists site_visits_user_id_idx
  on public.site_visits (user_id, created_at desc);

alter table public.profiles
  add column if not exists acquisition_source_channel text,
  add column if not exists acquisition_path text,
  add column if not exists acquisition_referrer text,
  add column if not exists acquisition_utm_source text,
  add column if not exists acquisition_utm_medium text,
  add column if not exists acquisition_utm_campaign text,
  add column if not exists acquisition_recorded_at timestamptz;

create index if not exists profiles_acquisition_channel_idx
  on public.profiles (acquisition_source_channel, created_at desc);
