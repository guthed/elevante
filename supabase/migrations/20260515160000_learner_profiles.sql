-- Lärprofil: Elevantes bild av HUR en elev lär sig och uttrycker sig.
--
-- En rad per elev. Byggs av en AI-analys av elevens rättade testprov —
-- mönster som "stark på fakta men skriver för kort", "bra på resonemang".
-- Profilen matas in i test-rättning och chatt så feedbacken blir
-- personanpassad.
--
-- RLS: bara eleven själv ser sin profil. Läraren har INGEN åtkomst — en
-- profil över en minderårigs styrkor/svagheter är känslig persondata och
-- ska vara elevens eget verktyg. (Vid riktig pilot: GDPR-granskning krävs.)

create table if not exists public.learner_profiles (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  strengths jsonb not null default '[]'::jsonb,
  growth_areas jsonb not null default '[]'::jsonb,
  summary text not null default '',
  tests_analyzed integer not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.learner_profiles enable row level security;

create policy "learner_profiles_owner_select" on public.learner_profiles
  for select to authenticated using (profile_id = (select auth.uid()));
create policy "learner_profiles_owner_insert" on public.learner_profiles
  for insert to authenticated with check (profile_id = (select auth.uid()));
create policy "learner_profiles_owner_update" on public.learner_profiles
  for update to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));
