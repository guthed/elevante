-- Säkerhetsfix upptäckt vid kodgranskning av Task 3 (OAuth-gating): RLS-policyn
-- `profiles_update_self` är radskopad men INTE kolumnskopad — en inloggad
-- användare (inkl. en nyskapad 'pending'-användare) kunde köra
-- `.from('profiles').update({ role: 'admin', school_id: '<valfri skola>', status: 'active' }).eq('id', mitt-eget-id)`
-- direkt från webbläsaren och kringgå hela provisioneringsflödet (invite-matchning,
-- domän-matchning, admin-godkännande). Det gör den nya `status`-gaten verkningslös.
--
-- Kolumnnivå-GRANT/REVOKE duger inte här: appens "admin"-roll är bara ett
-- värde i profiles.role, inte en egen Postgres-roll — både självredigering och
-- adminens redigering av andra användare går via samma Postgres-roll
-- `authenticated`. Låser istället role/school_id/status i en BEFORE UPDATE-
-- trigger: service-role (OAuth-callbacken, claim-invite-flödet,
-- admin-godkännande) går alltid igenom. En inloggad användares update av SIN
-- EGEN rad kan aldrig ändra dessa tre kolumner — bara full_name/email. Admins
-- redigering av ANDRA användares rad (updateUserRole i app/actions/admin.ts)
-- påverkas inte, eftersom `new.id != auth.uid()` i det fallet.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.id = auth.uid() then
    new.role := old.role;
    new.school_id := old.school_id;
    new.status := old.status;
  end if;

  return new;
end;
$$;

create trigger profiles_protect_privileged_columns
before update on public.profiles
for each row execute function public.protect_profile_privileged_columns();

-- Fynd #6 från samma granskning: unique-constrainten på identity_domain är
-- case-sensitive medan gating-koden matchar case-insensitive (ilike). Två
-- skolrader som bara skiljer sig i casing (t.ex. "Example.se" / "example.se")
-- skulle båda kunna existera och få ilike-uppslaget att matcha flera rader.
alter table public.schools drop constraint schools_identity_domain_key;
create unique index schools_identity_domain_lower_idx
  on public.schools (lower(identity_domain));
