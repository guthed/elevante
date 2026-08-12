-- Backfyllnad: redan applicerad mot prod (msqfuywpbrteyrzjggsw, version
-- 20260515175751) men saknade lokal fil. Transkriberad från
-- supabase_migrations.schema_migrations.statements 2026-08-12 under
-- utredningen av school-provisioning-grenens migrationskonflikt.
create or replace function public.delete_lesson(p_lesson_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner uuid;
begin
  select teacher_id into v_owner from public.lessons where id = p_lesson_id;
  if v_owner is null then
    raise exception 'Inspelningen hittades inte';
  end if;
  if v_owner is distinct from auth.uid() then
    raise exception 'Du kan bara radera dina egna inspelningar';
  end if;

  delete from public.chat_messages
    where chat_id in (select id from public.chats where lesson_id = p_lesson_id);
  delete from public.chats where lesson_id = p_lesson_id;
  delete from public.lesson_chunks where lesson_id = p_lesson_id;
  delete from public.materials where lesson_id = p_lesson_id;
  delete from public.lesson_views where lesson_id = p_lesson_id;

  update public.chats
    set lesson_ids = array_remove(lesson_ids, p_lesson_id)
    where lesson_ids is not null and p_lesson_id = any(lesson_ids);
  update public.practice_tests
    set lesson_ids = array_remove(lesson_ids, p_lesson_id)
    where lesson_ids is not null and p_lesson_id = any(lesson_ids);

  delete from public.lessons where id = p_lesson_id;
end;
$$;

grant execute on function public.delete_lesson(uuid) to authenticated;
