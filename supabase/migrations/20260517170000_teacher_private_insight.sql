-- Förståelsekartan blir lärarprivat.
--
-- Tidigare lät 20260515090200 alla lärare OCH admin i samma skola läsa
-- elevchats, och 20260515090000 (lesson_views_school_select) lät alla
-- lärare/admin läsa lesson_views. Det gjorde insikts-heatmapen synlig för
-- skolledning och kollegor.
--
-- Nu: bara läraren som äger lektionen (lessons.teacher_id) ser insikts-
-- datan för den lektionen. Admin och andra lärare förlorar åtkomsten.
-- Elevernas egna self-select-policyer är orörda — eleven ser fortfarande
-- bara sina egna chats och views.

-- chats: bara den ägande läraren, via lesson-scope-chat → lektionens teacher_id.
-- Course-/selection-scope-chattar (lesson_id null) blir därmed oläsbara för
-- lärare, vilket är önskat — heatmapen använder bara lesson-scope-chattar.
drop policy if exists "chats_teacher_admin_school_select" on public.chats;

create policy "chats_owning_teacher_select"
  on public.chats for select
  to authenticated
  using (
    public.current_user_role() = 'teacher'
    and exists (
      select 1 from public.lessons l
      where l.id = chats.lesson_id
        and l.teacher_id = (select auth.uid())
    )
  );

-- chat_messages: samma avgränsning, via chat → lesson → teacher_id.
drop policy if exists "chat_messages_teacher_admin_school_select" on public.chat_messages;

create policy "chat_messages_owning_teacher_select"
  on public.chat_messages for select
  to authenticated
  using (
    public.current_user_role() = 'teacher'
    and exists (
      select 1
      from public.chats c
      join public.lessons l on l.id = c.lesson_id
      where c.id = chat_messages.chat_id
        and l.teacher_id = (select auth.uid())
    )
  );

-- lesson_views: bara den ägande läraren ser engagemangsdatan.
drop policy if exists "lesson_views_school_select" on public.lesson_views;

create policy "lesson_views_owning_teacher_select"
  on public.lesson_views for select
  to authenticated
  using (
    public.current_user_role() = 'teacher'
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_views.lesson_id
        and l.teacher_id = (select auth.uid())
    )
  );
