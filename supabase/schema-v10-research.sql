-- BRICLOG Research Mode (schema-v3-memory.sql 이후 실행)
-- content_items 에 조사 결과 저장

alter table public.content_items
  add column if not exists research_query text not null default '',
  add column if not exists research_result jsonb not null default '{}'::jsonb,
  add column if not exists research_date timestamptz,
  add column if not exists research_source jsonb not null default '[]'::jsonb;

comment on column public.content_items.research_query is 'Research Mode 주제';
comment on column public.content_items.research_result is '요약·키워드·경쟁사 등 JSON';
comment on column public.content_items.research_date is '조사 수행 시각';
comment on column public.content_items.research_source is '출처 목록 JSON 배열';
