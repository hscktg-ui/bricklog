-- Admin 유입 경로·UTM 집계 (site_visits 확장)
alter table public.site_visits
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists source_channel text;

create index if not exists site_visits_source_channel_idx
  on public.site_visits (source_channel, created_at desc);

create index if not exists site_visits_utm_source_idx
  on public.site_visits (utm_source, created_at desc);
