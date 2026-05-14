-- RPC för att spåra elev-views på lektioner (upsert med view_count-inkrement).
-- Anropas från lib/data/student.ts när elev öppnar en lektion.

create or replace function public.track_lesson_view(lesson_id_arg uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.lesson_views (lesson_id, profile_id, view_count)
  values (lesson_id_arg, auth.uid(), 1)
  on conflict (lesson_id, profile_id)
  do update set
    view_count = public.lesson_views.view_count + 1,
    last_viewed_at = now();
end;
$$;

revoke all on function public.track_lesson_view(uuid) from public, anon;
grant execute on function public.track_lesson_view(uuid) to authenticated;
