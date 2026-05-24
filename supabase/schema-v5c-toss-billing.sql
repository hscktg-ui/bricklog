-- BRICLOG Toss Payments (schema v5c)
-- Run after schema-v5-billing.sql

create table if not exists public.billing_checkouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id text not null unique,
  plan_id text not null check (plan_id in ('brand', 'studio')),
  amount int not null check (amount > 0),
  mode text not null default 'payment' check (mode in ('payment', 'billing')),
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'failed', 'expired')),
  payment_key text,
  billing_key text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists billing_checkouts_user_status_idx
  on public.billing_checkouts (user_id, status, created_at desc);

alter table public.billing_checkouts enable row level security;

-- Server (service role) only — no client policies

create table if not exists public.toss_billing_keys (
  user_id uuid primary key references auth.users (id) on delete cascade,
  customer_key text not null,
  billing_key text not null,
  card_company text,
  card_number_masked text,
  plan_id text check (plan_id in ('brand', 'studio')),
  updated_at timestamptz not null default now()
);

alter table public.toss_billing_keys enable row level security;
