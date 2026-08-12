-- Slutgranskning av hela school-provisioning-grenen (18 redan granskade
-- commits) hittade två luckor av samma klass som ingen enskild
-- uppgifts-review kunde se, plus en angränsande korrekthetslucka:
--
-- 1. is_staff är self-grantable. 20260811130000_admin_staff_flag.sql
--    lade till profiles.is_staff för att gata /admin/skolor, /admin/crm,
--    /admin/intresse, createSchool, crm.ts och inviteUsers bootstrap-gren
--    — men den befintliga policyn profiles_update_self
--    (20260514183000_initial_schema.sql) låter VILKEN inloggad användare
--    som helst PATCHa sin egen profiles-rad utan kolumnrestriktion. Vem
--    som helst kan alltså sätta is_staff=true på sig själv direkt via
--    PostgREST och helt kringgå Task 1b:s app-lagers-gate.
-- 2. Fyra andra tabeller med Elevantes interna sälj-/CRM-data
--    (skolnamn, kontaktuppgifter, AI-genererade briefs, lead-meddelanden)
--    gatades fortfarande bara på role='admin', aldrig patchade när
--    is_staff infördes eftersom de inte var en del av det ursprungliga
--    admin_staff_flag-uppdraget. En kunds egen skoladmin (role='admin',
--    is_staff=false) kan läsa hela säljpipelinen via direkt REST-anrop
--    trots att UI-sidorna stängdes i Task 1b.
--
-- Fixen: en trigger som blockerar alla icke-service-role-ändringar av
-- is_staff, plus en current_user_is_staff()-helper (mönster efter
-- current_user_role()/current_school_id() i initial_schema.sql) som
-- läggs till i de fyra läckande policyerna.

-- ---------------------------------------------------------------------------
-- 1. Skydda is_staff mot self-escalation.
-- ---------------------------------------------------------------------------
-- Förhindrar self-escalation: profiles_update_self (initial_schema.sql)
-- tillåter varje inloggad användare att PATCHa sin egen profil rakt via
-- PostgREST — utan detta kunde vem som helst sätta is_staff=true på sig
-- själv och kringgå hela Task 1b-gatet, oavsett vad appens Server Actions
-- kollar. Bara service-role (manuell SQL, eller ett framtida staff-verktyg)
-- får ändra kolumnen.
-- Täcker även INSERT: profiles_admin_manage (initial_schema.sql) är
-- `for all`, så den styr inte bara UPDATE utan även INSERT/DELETE utan
-- kolumnrestriktion. En kunds egen skoladmin skulle annars kunna DELETE:a
-- en befintlig profil i sin skola (t.ex. en lärare de bjudit in) och sedan
-- INSERT:a tillbaka den med is_staff=true — en BEFORE UPDATE-trigger
-- fångar aldrig vare sig DELETE eller INSERT. Kräver två konton (att
-- radera sin egen profil tar bort den egna admin-behörigheten innan man
-- hinner sätta tillbaka den), så det är en svårare men reell väg utöver
-- den ursprungliga UPDATE-baserade.
create or replace function public.protect_is_staff()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.is_staff and auth.role() <> 'service_role' then
      raise exception 'is_staff kan bara sättas av service-role';
    end if;
  elsif new.is_staff is distinct from old.is_staff and auth.role() <> 'service_role' then
    raise exception 'is_staff kan bara ändras av service-role';
  end if;
  return new;
end;
$$;

create trigger profiles_protect_is_staff
before insert or update on public.profiles
for each row execute function public.protect_is_staff();

-- ---------------------------------------------------------------------------
-- 2. current_user_is_staff() — mönster efter current_user_role()/
--    current_school_id() i initial_schema.sql.
-- ---------------------------------------------------------------------------
create or replace function public.current_user_is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(is_staff, false) from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- 3. Gata de fyra läckande CRM-policyerna med is_staff, inte bara
--    role='admin'. Samma läckageklass som Task 1b stängde för UI-sidorna,
--    men detta stänger datavägen (direkt REST) i stället.
-- ---------------------------------------------------------------------------
alter policy "school_prospects_admin_read" on public.school_prospects
  using (public.current_user_role() = 'admin' and public.current_user_is_staff());

alter policy "school_lookups_admin_read" on public.school_lookups
  using (public.current_user_role() = 'admin' and public.current_user_is_staff());

alter policy "school_sync_log_admin_read" on public.school_sync_log
  using (public.current_user_role() = 'admin' and public.current_user_is_staff());

alter policy "school_page_views_admin_read" on public.school_page_views
  using (public.current_user_role() = 'admin' and public.current_user_is_staff());
