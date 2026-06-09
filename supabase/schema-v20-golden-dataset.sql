-- BRICLOG: Golden Dataset — 해신기획 우수글 기준점 (schema-v6 이후)
-- Supabase SQL Editor에서 실행

create table if not exists public.golden_content_samples (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  industry text not null,
  writing_style text,
  emotion_type text,
  search_intent text,
  brand_presence_score numeric default 0,
  sample_kind text not null default 'excellent',
  fail_reason text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists golden_content_samples_industry_idx
  on public.golden_content_samples (industry, created_at desc);

create index if not exists golden_content_samples_active_idx
  on public.golden_content_samples (is_active, industry);

alter table public.golden_content_samples enable row level security;
-- authenticated 정책 없음 — service role·관리자 API만

comment on table public.golden_content_samples is
  '업종별 우수글 Golden Dataset — 생성 결과 비교·프롬프트 참조 SSOT';
