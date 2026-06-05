-- 휴대폰 인증 중복 가입 방지 (1번호 = 1인증 계정)
alter table public.profiles
  add column if not exists contact_phone_normalized text;

create unique index if not exists profiles_verified_phone_uidx
  on public.profiles (contact_phone_normalized)
  where phone_verified_at is not null
    and contact_phone_normalized is not null;

create index if not exists profiles_contact_phone_normalized_idx
  on public.profiles (contact_phone_normalized)
  where contact_phone_normalized is not null;
