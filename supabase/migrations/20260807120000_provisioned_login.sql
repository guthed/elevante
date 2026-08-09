-- Provisionerad inloggning: konton kan aldrig uppstå av sig själva.
-- profiles.status gatear åtkomst tills en admin (eller en matchad invite) aktiverar kontot.
-- user_invites är sanningskällan för vilka e-postadresser som är godkända, oavsett om
-- de löses in via Google-OAuth, Microsoft-OAuth eller ett mejl-länk-flöde.

create type public.profile_status as enum ('pending', 'active', 'disabled');

-- Default 'active' på kolumnnivå backfyller alla befintliga rader och skyddar alla
-- insert-vägar som inte går via handle_new_auth_user() (t.ex. service-role-seedskript).
-- Triggern nedan sätter explicit 'pending' för riktiga inloggningsförsök.
alter table public.profiles
  add column status public.profile_status not null default 'active';

-- Generisk domänkolumn — gäller både Google Workspace och Microsoft 365/Entra ID,
-- eftersom en skolas e-postdomän är densamma oavsett identitetsleverantör.
alter table public.schools
  add column identity_domain text unique;

create table public.user_invites (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  email text not null,
  full_name text,
  role public.user_role not null,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days',
  claimed_at timestamptz
);
create index user_invites_school_idx on public.user_invites(school_id);

-- En e-post kan bara ha en oanvänd invite åt gången.
create unique index user_invites_email_unclaimed_idx
  on public.user_invites (lower(email))
  where claimed_at is null;

alter table public.user_invites enable row level security;

create policy "user_invites_admin_all"
  on public.user_invites for all
  to authenticated
  using (
    public.current_user_role() = 'admin'
    and school_id = public.current_school_id()
  )
  with check (
    public.current_user_role() = 'admin'
    and school_id = public.current_school_id()
  );

-- Riktiga inloggningsförsök (OAuth eller framtida password-signup) hamnar i 'pending'
-- tills applikationskoden (OAuth-callbacken eller claim-länken) aktiverar kontot.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'pending'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
