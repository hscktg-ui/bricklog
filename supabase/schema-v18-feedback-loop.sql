-- BRICLOG Feedback Loop v2 — 의도 저장 · 재작성 회차 (schema-v6 이후)

alter table public.content_feedback
  add column if not exists intents text[] not null default '{}';

alter table public.content_feedback
  add column if not exists rewrite_round int not null default 0;

create index if not exists content_feedback_updated_idx
  on public.content_feedback (updated_at desc);

create index if not exists content_feedback_reaction_idx
  on public.content_feedback (reaction, updated_at desc);
