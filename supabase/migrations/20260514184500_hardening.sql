-- Elevante: hardening efter initial migration.
--
-- 1. Säkerhet — revoke EXECUTE på trigger-only-funktioner från anon/authenticated
--    så de inte kan anropas via PostgREST RPC.
-- 2. Prestanda — skriv om RLS-policies så `auth.uid()` evalueras en gång
--    per query (`(select auth.uid())`) i stället för en gång per rad.
-- 3. Prestanda — täckande index på alla foreign keys som saknade dem.

-- ---------------------------------------------------------------------------
-- 1. Säkerhet: lås ner trigger-funktioner
-- ---------------------------------------------------------------------------
revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

-- current_school_id / current_user_role behövs av RLS-policies som körs av
-- authenticated; vi behåller EXECUTE där men revoke:ar från anon.
revoke execute on function public.current_school_id() from anon;
revoke execute on function public.current_user_role() from anon;

-- ---------------------------------------------------------------------------
-- 2. Prestanda: byt auth.uid() mot (select auth.uid()) i policies
-- ---------------------------------------------------------------------------

-- profiles
drop policy if exists "profiles_select_same_school" on public.profiles;
create policy "profiles_select_same_school"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or school_id = public.current_school_id()
  );

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- lessons
drop policy if exists "lessons_teacher_write_own" on public.lessons;
create policy "lessons_teacher_write_own"
  on public.lessons for all
  to authenticated
  using (
    (teacher_id = (select auth.uid()) or public.current_user_role() = 'admin')
    and school_id = public.current_school_id()
  )
  with check (
    (teacher_id = (select auth.uid()) or public.current_user_role() = 'admin')
    and school_id = public.current_school_id()
  );

-- materials
drop policy if exists "materials_teacher_write_own_lesson" on public.materials;
create policy "materials_teacher_write_own_lesson"
  on public.materials for insert
  to authenticated
  with check (
    school_id = public.current_school_id()
    and (
      public.current_user_role() = 'admin'
      or exists (
        select 1 from public.lessons l
        where l.id = materials.lesson_id
          and (l.teacher_id = (select auth.uid()) or public.current_user_role() = 'admin')
      )
    )
  );

drop policy if exists "materials_teacher_delete_own" on public.materials;
create policy "materials_teacher_delete_own"
  on public.materials for delete
  to authenticated
  using (
    school_id = public.current_school_id()
    and (uploaded_by = (select auth.uid()) or public.current_user_role() = 'admin')
  );

-- chats
drop policy if exists "chats_self_select" on public.chats;
create policy "chats_self_select"
  on public.chats for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "chats_self_insert" on public.chats;
create policy "chats_self_insert"
  on public.chats for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and school_id = public.current_school_id()
  );

drop policy if exists "chats_self_update" on public.chats;
create policy "chats_self_update"
  on public.chats for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "chats_self_delete" on public.chats;
create policy "chats_self_delete"
  on public.chats for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- chat_messages
drop policy if exists "chat_messages_self_select" on public.chat_messages;
create policy "chat_messages_self_select"
  on public.chat_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.chats c
      where c.id = chat_messages.chat_id and c.user_id = (select auth.uid())
    )
  );

drop policy if exists "chat_messages_self_insert" on public.chat_messages;
create policy "chat_messages_self_insert"
  on public.chat_messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.chats c
      where c.id = chat_messages.chat_id and c.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Prestanda: covering index på alla FK som saknade dem
-- ---------------------------------------------------------------------------
create index if not exists chats_school_idx on public.chats(school_id);
create index if not exists class_members_profile_idx on public.class_members(profile_id);
create index if not exists course_teachers_profile_idx on public.course_teachers(profile_id);
create index if not exists lessons_school_idx on public.lessons(school_id);
create index if not exists lessons_teacher_idx on public.lessons(teacher_id);
create index if not exists lessons_timeslot_idx on public.lessons(timeslot_id);
create index if not exists materials_uploaded_by_idx on public.materials(uploaded_by);
create index if not exists timeslots_class_idx on public.timeslots(class_id);
create index if not exists timeslots_course_idx on public.timeslots(course_id);
create index if not exists timeslots_teacher_idx on public.timeslots(teacher_id);
