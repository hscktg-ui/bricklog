-- BRICLOG subscription plan changes (schema v5d)
-- Run after schema-v5-billing.sql and schema-v5c-toss-billing.sql

alter table public.user_subscriptions
  add column if not exists pending_plan text
    check (pending_plan is null or pending_plan in ('free', 'brand', 'studio', 'pro')),
  add column if not exists plan_effective_at timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists payment_provider text default 'toss',
  add column if not exists last_payment_at timestamptz;

comment on column public.user_subscriptions.pending_plan is
  'Scheduled plan after current_period_end (downgrade or deferred upgrade).';
comment on column public.user_subscriptions.plan_effective_at is
  'When pending_plan becomes active; also used for cancel-at-period-end.';
comment on column public.user_subscriptions.cancel_at_period_end is
  'If true, subscription moves to free at current_period_end.';

alter table public.billing_checkouts
  add column if not exists change_kind text not null default 'subscribe'
    check (change_kind in ('subscribe', 'upgrade', 'renewal'));
