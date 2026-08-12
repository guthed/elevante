-- Förenar två konkurrerande handle_new_auth_user()-migrationer som båda
-- byter ut samma trigger:
--
-- 1. 20260811120000_school_provisioning.sql (denna branch) — läser
--    role/school_id ur invite-metadata (auth.admin.inviteUserByEmail via
--    inviteUserCore) så att admin-inbjudna konton landar med rätt roll
--    och skola direkt, istället för att alltid bli role='student',
--    school_id=null.
-- 2. 20260807084220_provisioned_login.sql — redan applicerad mot prod
--    (2026-08-07), upptäckt och backfyllad som lokal fil under denna
--    branchs slutgranskning. Lade till profiles.status
--    ('pending'|'active'|'disabled') och satte ALLA nya konton till
--    'pending', oavsett metadata.
--
-- De skrevs oberoende av varandra och känner inte till varandras ändring
-- av samma funktion — appliceras de i ordning skulle den andra tyst
-- radera den första. Den här migrationen kombinerar båda avsikterna i en
-- slutgiltig funktionsdefinition:
--
--   - En admin-driven invite (role/school_id i metadata, alltid med
--     school_id enligt inviteUserCore) ÄR redan en explicit godkänd
--     inbjudan av en riktig admin — sådana konton får status='active'
--     direkt.
--   - Självregistrering (signUp utan metadata, dagens /signup-flöde,
--     obesörd av denna branch) saknar school_id och får status='pending',
--     enligt provisioned_logins ursprungliga avsikt.
--
-- Ingen applikationskod läser status någonstans än (user_invites/
-- identity_domain/lock_profile_privileged_columns rörs inte här och
-- lämnas orörda, oanvända, för en eventuell framtida OAuth-provisionering-
-- funktion) — så det här är förberedande grundarbete, inte en
-- beteendeändring idag.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_school_id uuid;
  v_status public.profile_status;
begin
  begin
    v_role := (new.raw_user_meta_data ->> 'role')::public.user_role;
  exception when others then
    raise warning 'handle_new_auth_user: bad role metadata for %: %', new.id, sqlerrm;
    v_role := null;
  end;
  if v_role is null then
    v_role := 'student';
  end if;

  begin
    v_school_id := (new.raw_user_meta_data ->> 'school_id')::uuid;
  exception when others then
    raise warning 'handle_new_auth_user: bad school_id metadata for %: %', new.id, sqlerrm;
    v_school_id := null;
  end;
  if v_school_id is not null and not exists (
    select 1 from public.schools where id = v_school_id
  ) then
    v_school_id := null;
  end if;

  if v_school_id is not null then
    v_status := 'active';
  else
    v_status := 'pending';
  end if;

  insert into public.profiles (id, email, full_name, role, school_id, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    v_role,
    v_school_id,
    v_status
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
