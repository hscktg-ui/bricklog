-- BRICLOG: profiles.role — clients cannot self-promote to ADMIN
-- Run after schema-v7-auth-profiles.sql

create or replace function public.profiles_protect_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.jwt() ->> 'role', '') = 'service_role' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    if new.role is distinct from 'USER' then
      new.role := 'USER';
    end if;
    return new;
  end if;
  new.role := old.role;
  return new;
end;
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before insert or update on public.profiles
  for each row execute function public.profiles_protect_role();
