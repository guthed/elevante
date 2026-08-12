-- Backfyllnad: redan applicerad mot prod (msqfuywpbrteyrzjggsw, version
-- 20260807091838) men saknade lokal fil — se 20260807084220_provisioned_login.sql.
-- Transkriberad från supabase_migrations.schema_migrations.statements
-- 2026-08-12 under utredningen av school-provisioning-grenens
-- migrationskonflikt.
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

alter table public.schools drop constraint schools_identity_domain_key;
create unique index schools_identity_domain_lower_idx
  on public.schools (lower(identity_domain));
