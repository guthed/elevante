-- Elevante: arkiverade lektioner ska inte matchas av RAG.
-- Chunks behålls (för snabb återställning) men exkluderas medan archived_at är satt.

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
  join public.lessons l on l.id = c.lesson_id
  where c.lesson_id = lesson_id_filter
    and l.archived_at is null
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
    and l.archived_at is null
    and c.embedding is not null
  order by c.embedding operator(extensions.<=>) query_embedding
  limit top_k;
$$;

revoke all on function public.match_lesson_chunks(extensions.vector(1024), uuid, integer) from public, anon;
revoke all on function public.match_course_chunks(extensions.vector(1024), uuid, integer) from public, anon;
grant execute on function public.match_lesson_chunks(extensions.vector(1024), uuid, integer) to authenticated;
grant execute on function public.match_course_chunks(extensions.vector(1024), uuid, integer) to authenticated;
