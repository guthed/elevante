-- Elevante: byt match_*_chunks till SECURITY INVOKER.
--
-- Tidigare var de SECURITY DEFINER vilket bypassade RLS. Med INVOKER och
-- befintlig RLS på lesson_chunks (`school_id = public.current_school_id()`)
-- får anroparen automatiskt bara chunks inom sin egen skola, även om de
-- råkar känna till ett lesson_id i en annan skola.
--
-- Revoke från PUBLIC på de återstående helper-funktionerna så att
-- supabase-linterns 0028/0029 inte triggas för anon.

drop function if exists public.match_lesson_chunks(extensions.vector(1024), uuid, integer);
drop function if exists public.match_course_chunks(extensions.vector(1024), uuid, integer);

create or replace function public.match_lesson_chunks(
  query_embedding extensions.vector(1024),
  lesson_id_filter uuid,
  top_k integer default 5
)
returns table (
  id uuid,
  content text,
  similarity float
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.content,
    1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.lesson_chunks c
  where c.lesson_id = lesson_id_filter
    and c.embedding is not null
  order by c.embedding operator(extensions.<=>) query_embedding
  limit top_k;
$$;

create or replace function public.match_course_chunks(
  query_embedding extensions.vector(1024),
  course_id_filter uuid,
  top_k integer default 8
)
returns table (
  id uuid,
  lesson_id uuid,
  content text,
  similarity float
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.lesson_id,
    c.content,
    1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.lesson_chunks c
  join public.lessons l on l.id = c.lesson_id
  where l.course_id = course_id_filter
    and c.embedding is not null
  order by c.embedding operator(extensions.<=>) query_embedding
  limit top_k;
$$;

revoke all on function public.match_lesson_chunks(extensions.vector(1024), uuid, integer) from public, anon;
revoke all on function public.match_course_chunks(extensions.vector(1024), uuid, integer) from public, anon;
grant execute on function public.match_lesson_chunks(extensions.vector(1024), uuid, integer) to authenticated;
grant execute on function public.match_course_chunks(extensions.vector(1024), uuid, integer) to authenticated;

-- current_school_id / current_user_role är SECURITY DEFINER eftersom de
-- används av RLS-policies på profiles (annars recursion). Behåll EXECUTE
-- för authenticated och service_role, revoke från public.
revoke all on function public.current_school_id() from public, anon;
revoke all on function public.current_user_role() from public, anon;
grant execute on function public.current_school_id() to authenticated, service_role;
grant execute on function public.current_user_role() to authenticated, service_role;
