-- Dela testprov med läraren.
--
-- Eleven äger sina prov. Efter ett rättat prov kan eleven aktivt dela det
-- med sin lärare — då sätts shared_with_teacher. Lärare/admin i samma skola
-- får läsa prov först när flaggan är satt; orörda prov förblir privata.
-- Samma samtyckes-princip som chat-läsningen (kräver elev/föräldra-samtycke
-- vid pilot mot riktig skola).

alter table public.practice_tests
  add column if not exists shared_with_teacher boolean not null default false,
  add column if not exists shared_at timestamptz;

create policy "practice_tests_teacher_shared_select" on public.practice_tests
  for select to authenticated
  using (
    public.current_user_role() in ('teacher', 'admin')
    and school_id = public.current_school_id()
    and shared_with_teacher = true
  );
