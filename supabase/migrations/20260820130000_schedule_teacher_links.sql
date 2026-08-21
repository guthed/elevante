-- Kopplar pass till schemakällans lärare, inte bara till Elevante-kontot.
--
-- Två problem i Fas A som den här tabellen löser:
--
-- 1. `timeslots.teacher_id` är null när läraren ännu inte mappats till ett
--    konto — och då finns ingen som helst spår av VILKEN schemalärare
--    passet hörde till. En mappning som görs efter importen ("Alfred" →
--    alfred@skolan.se) hade därför inte kunnat appliceras på något.
--    Adminen hade tvingats importera om hela schemat.
--
-- 2. 15 av 328 lektioner/vecka på Amerikanska Gymnasiet har flera lärare.
--    commit.ts skrev bara den första till `teacher_id` och tappade resten
--    tyst — samma dataförlust som `timeslot_classes` finns till för att
--    undvika på klassidan.
--
-- `timeslots.teacher_id` finns kvar som "primär lärare" (den första
-- mappade), precis som `class_id` är primär klass. All befintlig kod
-- fungerar oförändrad.

create table if not exists public.timeslot_teachers (
  timeslot_id uuid not null references public.timeslots(id) on delete cascade,
  teacher_map_id uuid not null
    references public.schedule_teacher_map(id) on delete cascade,
  primary key (timeslot_id, teacher_map_id)
);

create index if not exists timeslot_teachers_map_idx
  on public.timeslot_teachers (teacher_map_id);

alter table public.timeslot_teachers enable row level security;

-- Samma nivå som timeslot_classes: läsbart i skolan, skrivbart av admin.
drop policy if exists "timeslot_teachers_select_same_school" on public.timeslot_teachers;
create policy "timeslot_teachers_select_same_school"
  on public.timeslot_teachers for select
  to authenticated
  using (
    exists (
      select 1 from public.timeslots t
      where t.id = timeslot_teachers.timeslot_id
        and t.school_id = public.current_school_id()
    )
  );

drop policy if exists "timeslot_teachers_admin_write" on public.timeslot_teachers;
create policy "timeslot_teachers_admin_write"
  on public.timeslot_teachers for all
  to authenticated
  using (
    public.current_user_role() = 'admin'
    and exists (
      select 1 from public.timeslots t
      where t.id = timeslot_teachers.timeslot_id
        and t.school_id = public.current_school_id()
    )
  )
  with check (
    public.current_user_role() = 'admin'
    and exists (
      select 1 from public.timeslots t
      where t.id = timeslot_teachers.timeslot_id
        and t.school_id = public.current_school_id()
    )
  );
