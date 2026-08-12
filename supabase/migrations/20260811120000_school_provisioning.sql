-- Utökar handle_new_auth_user() så att inbjudna användare (via
-- auth.admin.inviteUserByEmail med data: {role, school_id, full_name})
-- får rätt roll och skola direkt, istället för att alltid landa som
-- role='student', school_id=null. Självregistrering (signUp utan
-- metadata) fortsätter fungera precis som idag via fallbacken.
--
-- Silent-fallback-beteende (avsiktligt): saknad/ogiltig role faller
-- tillbaka till 'student'; saknad/ogiltig/obefintlig school_id faller
-- tillbaka till null. `exception when others` används genomgående för
-- att aldrig blockera kontoskapande vid signup/invite — men varje
-- fallback loggar en `raise warning` med sqlerrm så trasig metadata
-- (fel nyckel, fel casing, trasigt UUID) syns i Postgres-loggarna
-- istället för att tyst producera fel roll/skola.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.user_role;
  v_school_id uuid;
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

  insert into public.profiles (id, email, full_name, role, school_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    v_role,
    v_school_id
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
