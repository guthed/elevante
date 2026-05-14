-- Lärar/admin-access till elevchats för insikt-vyn.
--
-- Tidigare hade chats/chat_messages strikt RLS: bara den egna eleven såg sina chats.
-- För teacher-insight (heatmap + drilldowns) behöver lärare och admin i samma skola
-- kunna läsa elevernas frågor. Detta ändrar privacy-modellen — kräver
-- föräldra/elev-samtycke vid pilot mot riktig skola (separat Notion-task finns).
--
-- För demo med test-konton är detta säkert.

create policy "chats_teacher_admin_school_select"
  on public.chats for select
  to authenticated
  using (
    public.current_user_role() in ('teacher', 'admin')
    and school_id = public.current_school_id()
  );

create policy "chat_messages_teacher_admin_school_select"
  on public.chat_messages for select
  to authenticated
  using (
    public.current_user_role() in ('teacher', 'admin')
    and exists (
      select 1 from public.chats c
      where c.id = chat_messages.chat_id
        and c.school_id = public.current_school_id()
    )
  );
