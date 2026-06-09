-- BRICLOG: Golden Dataset sample_kind (excellent | failure)
-- Supabase SQL Editor에서 schema-v20 적용 후 실행

alter table public.golden_content_samples
  add column if not exists sample_kind text not null default 'excellent';

create index if not exists golden_content_samples_kind_idx
  on public.golden_content_samples (sample_kind, industry);

comment on column public.golden_content_samples.sample_kind is
  'excellent | failure — 우수글 vs 실패글 패턴';
