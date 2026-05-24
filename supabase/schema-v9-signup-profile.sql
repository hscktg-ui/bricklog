-- BRICLOG signup profile expansion (v7 이후 실행)
-- 희망 닉네임(대소문자 무시 유일) + 온보딩 힌트용 필드

alter table public.profiles
  add column if not exists nickname text,
  add column if not exists full_name text not null default '',
  add column if not exists contact_phone text,
  add column if not exists business_name text not null default '',
  add column if not exists job_title text not null default '',
  add column if not exists intended_brand_count smallint check (
    intended_brand_count is null
    or (intended_brand_count >= 1 and intended_brand_count <= 99)
  );

-- 닉네임: 공백 제외, 대소문자 무시 유일
create unique index if not exists profiles_nickname_lower_uidx
  on public.profiles (lower(trim(nickname)))
  where nickname is not null and trim(nickname) <> '';

create index if not exists profiles_business_name_idx
  on public.profiles (business_name)
  where trim(business_name) <> '';

-- 신규 가입 시 metadata → profiles
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_provider text;
  v_display text;
  v_nickname text;
  v_full_name text;
  v_phone text;
  v_business text;
  v_job text;
  v_brand_count smallint;
begin
  v_provider := coalesce(
    new.raw_app_meta_data->>'provider',
    new.raw_user_meta_data->>'provider',
    'email'
  );
  v_nickname := nullif(trim(new.raw_user_meta_data->>'nickname'), '');
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    ''
  );
  v_display := coalesce(
    v_nickname,
    v_full_name,
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1),
    '회원'
  );
  v_phone := nullif(trim(new.raw_user_meta_data->>'contact_phone'), '');
  v_business := coalesce(nullif(trim(new.raw_user_meta_data->>'business_name'), ''), '');
  v_job := coalesce(nullif(trim(new.raw_user_meta_data->>'job_title'), ''), '');
  begin
    v_brand_count := nullif(trim(new.raw_user_meta_data->>'intended_brand_count'), '')::smallint;
  exception when others then
    v_brand_count := null;
  end;

  insert into public.profiles (
    id,
    email,
    display_name,
    nickname,
    full_name,
    contact_phone,
    business_name,
    job_title,
    intended_brand_count,
    provider
  )
  values (
    new.id,
    coalesce(new.email, ''),
    v_display,
    v_nickname,
    v_full_name,
    v_phone,
    v_business,
    v_job,
    v_brand_count,
    v_provider
  )
  on conflict (id) do update set
    email = excluded.email,
    nickname = coalesce(nullif(excluded.nickname, ''), public.profiles.nickname),
    full_name = coalesce(nullif(excluded.full_name, ''), public.profiles.full_name),
    display_name = coalesce(
      nullif(excluded.display_name, ''),
      public.profiles.display_name
    ),
    contact_phone = coalesce(excluded.contact_phone, public.profiles.contact_phone),
    business_name = coalesce(
      nullif(excluded.business_name, ''),
      public.profiles.business_name
    ),
    job_title = coalesce(nullif(excluded.job_title, ''), public.profiles.job_title),
    intended_brand_count = coalesce(
      excluded.intended_brand_count,
      public.profiles.intended_brand_count
    ),
    provider = excluded.provider,
    updated_at = now();

  return new;
end;
$$;

-- 닉네임 실시간 중복 확인 (GET /api/auth/check-nickname) — v13과 동일, v9 적용 시 함께 생성
create or replace function public.check_nickname_available(
  p_nickname text,
  p_exclude_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_norm text := lower(trim(p_nickname));
  v_count int;
begin
  if v_norm is null or length(v_norm) < 2 then
    return jsonb_build_object('available', false, 'valid', false);
  end if;

  select count(*)::int
  into v_count
  from public.profiles
  where lower(trim(nickname)) = v_norm
    and nickname is not null
    and trim(nickname) <> ''
    and (p_exclude_user_id is null or id <> p_exclude_user_id);

  return jsonb_build_object('available', v_count = 0, 'valid', true);
end;
$$;

revoke all on function public.check_nickname_available(text, uuid) from public;
grant execute on function public.check_nickname_available(text, uuid) to anon, authenticated, service_role;
