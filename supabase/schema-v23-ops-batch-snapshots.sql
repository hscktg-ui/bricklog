-- Ops batch snapshots — cross-channel · engine-health (nightly evolution SSOT)
create table if not exists public.ops_batch_snapshots (
  snapshot_key text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists ops_batch_snapshots_updated_at_idx
  on public.ops_batch_snapshots (updated_at desc);

alter table public.ops_batch_snapshots enable row level security;
