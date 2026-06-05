-- BRICLOG: 전역 엔진 규칙 (Vercel·피드백 루프 — schema-v6 이후)
-- Supabase SQL Editor에서 실행

create table if not exists public.global_engine_rules (
  rule_key text primary key,
  rules jsonb not null default '{}'::jsonb,
  version int not null default 1,
  updated_at timestamptz not null default now()
);

create index if not exists global_engine_rules_updated_idx
  on public.global_engine_rules (updated_at desc);

alter table public.global_engine_rules enable row level security;
-- authenticated 정책 없음 — service role·서버 API만

comment on table public.global_engine_rules is
  '피드백·야간 집계로 누적된 전역 품질/프롬프트 규칙 (모든 사용자 생성에 주입)';
