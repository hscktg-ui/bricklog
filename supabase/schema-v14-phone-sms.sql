-- 휴대폰 SMS 인증 (가입·남용 방지)
create table if not exists public.phone_otp_verifications (
  id uuid primary key default gen_random_uuid(),
  phone_normalized text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  verified_at timestamptz,
  verify_attempts smallint not null default 0,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists phone_otp_phone_created_idx
  on public.phone_otp_verifications (phone_normalized, created_at desc);

alter table public.profiles
  add column if not exists phone_verified_at timestamptz;

-- 서버(service role)만 OTP 테이블 접근
alter table public.phone_otp_verifications enable row level security;
