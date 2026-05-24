-- 닉네임 중복 확인 (대소문자·공백 무시) — API /check-nickname 용
-- ⚠️ 이 파일만 실행하세요. schema-v2-saas.sql 등은 이미 적용됐을 수 있습니다.
-- (미실행 시 저장 단계에서만 중복 확인)
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
