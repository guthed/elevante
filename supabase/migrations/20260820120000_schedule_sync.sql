-- Schemasynk: datamodellen som både filimport och SS 12000-API delar.
--
-- Bakgrund: dagens uploadSchedule gör blind `insert` utan någon extern
-- nyckel, så en omuppladdning av samma schema dubblerar alla timeslots.
-- Dessutom har `timeslots` exakt en class_id, medan verkligheten på
-- Amerikanska Gymnasiet är att 145 av 328 lektioner/vecka har flera
-- klasser (språkval, IV-block — upp till sju klasser i ett pass).
--
-- Den här migrationen lägger grunden för båda källorna:
--   * external_ref  → idempotent upsert (samma pass uppdateras, dupliceras inte)
--   * timeslot_classes → alla klasser i passet; timeslots.class_id blir
--     "primär klass" (första i listan) så all befintlig kod — mobilappens
--     getTodayLessons(), lärarvyn, elevbiblioteket — fortsätter fungera
--     helt oförändrad. Befintliga rader får external_ref = null och ingen
--     rad i timeslot_classes, vilket är ett giltigt tillstånd.
--   * recordable → lunch, mentorstid och personalmöten ska inte spelas in.
--     I RS-filen är de 246 av 588 rader; via SS 12000 kommer det gratis
--     ur activityType-enumet.
--   * weeks → veckofilter. Behövs bara för filvägen (`inweek` = v2–24);
--     SS 12000 ger daterade kalenderhändelser direkt.

-- ---------------------------------------------------------------------------
-- Externa nycklar på befintliga tabeller
-- ---------------------------------------------------------------------------

alter table public.courses
  add column if not exists external_ref text,
  add column if not exists recordable boolean not null default true;

alter table public.timeslots
  add column if not exists external_ref text,
  add column if not exists weeks smallint[];

-- Partiellt unikt index, inte en unique-constraint: befintliga rader har
-- external_ref = null och flera null:ar ska få samsas.
create unique index if not exists courses_school_external_ref_key
  on public.courses (school_id, external_ref)
  where external_ref is not null;

create unique index if not exists timeslots_school_external_ref_key
  on public.timeslots (school_id, external_ref)
  where external_ref is not null;

-- ---------------------------------------------------------------------------
-- timeslot_classes — alla klasser som deltar i ett pass
-- ---------------------------------------------------------------------------

create table if not exists public.timeslot_classes (
  timeslot_id uuid not null references public.timeslots(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  primary key (timeslot_id, class_id)
);

create index if not exists timeslot_classes_class_idx
  on public.timeslot_classes (class_id);

alter table public.timeslot_classes enable row level security;

create policy "timeslot_classes_select_same_school"
  on public.timeslot_classes for select
  to authenticated
  using (
    exists (
      select 1 from public.timeslots t
      where t.id = timeslot_classes.timeslot_id
        and t.school_id = public.current_school_id()
    )
  );

create policy "timeslot_classes_admin_write"
  on public.timeslot_classes for all
  to authenticated
  using (
    public.current_user_role() = 'admin'
    and exists (
      select 1 from public.timeslots t
      where t.id = timeslot_classes.timeslot_id
        and t.school_id = public.current_school_id()
    )
  )
  with check (
    public.current_user_role() = 'admin'
    and exists (
      select 1 from public.timeslots t
      where t.id = timeslot_classes.timeslot_id
        and t.school_id = public.current_school_id()
    )
  );

-- ---------------------------------------------------------------------------
-- schedule_teacher_map — schemakällans lärare → Elevante-konto
-- ---------------------------------------------------------------------------
-- Royal Schedules filexport identifierar lärare med enbart förnamn
-- ("Alfred", "Akar") — ingen mejladress, ingen signatur. Kopplingen till
-- ett riktigt konto måste därför göras en gång av adminen och sparas, så
-- att nästa synk går automatiskt. profile_id är nullable: en omappad
-- lärare ska kunna ligga kvar i listan som "att göra" utan att blockera
-- resten av importen.

create table if not exists public.schedule_teacher_map (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  external_ref text not null,
  display_name text not null,
  profile_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (school_id, external_ref)
);

create index if not exists schedule_teacher_map_school_idx
  on public.schedule_teacher_map (school_id);

alter table public.schedule_teacher_map enable row level security;

-- Bara admin i samma skola. Läraruppslaget är administrativ data och har
-- ingen anledning att vara läsbart för elever.
create policy "schedule_teacher_map_admin_all"
  on public.schedule_teacher_map for all
  to authenticated
  using (
    public.current_user_role() = 'admin'
    and school_id = public.current_school_id()
  )
  with check (
    public.current_user_role() = 'admin'
    and school_id = public.current_school_id()
  );

-- ---------------------------------------------------------------------------
-- schedule_imports — körningslogg
-- ---------------------------------------------------------------------------

create table if not exists public.schedule_imports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  source text not null check (source in ('csv', 'royal-schedule-file', 'ss12000')),
  started_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  skipped_count integer not null default 0,
  error text
);

create index if not exists schedule_imports_school_idx
  on public.schedule_imports (school_id, started_at desc);

alter table public.schedule_imports enable row level security;

create policy "schedule_imports_admin_all"
  on public.schedule_imports for all
  to authenticated
  using (
    public.current_user_role() = 'admin'
    and school_id = public.current_school_id()
  )
  with check (
    public.current_user_role() = 'admin'
    and school_id = public.current_school_id()
  );
