-- Provplugg: stöd för chats som spänner ett urval av lektioner.
--
-- chats.lesson_ids håller de valda lektionerna. CHECK-villkoret utökas så
-- en 'selection'-chat måste ha en course_id (urvalet hör till en kurs) och
-- minst en lektion i lesson_ids.
--
-- match_course_chunks får ett valfritt lesson_ids_filter — när det sätts
-- begränsas vector-sökningen till just de lektionerna. Default null = hela
-- kursen, så befintliga course-scope-anrop fungerar oförändrat.

alter table public.chats
  add column if not exists lesson_ids uuid[];

alter table public.chats drop constraint if exists chats_check;
alter table public.chats drop constraint if exists chats_scope_target_check;
alter table public.chats add constraint chats_scope_target_check check (
  (scope = 'lesson' and lesson_id is not null)
  or (scope = 'course' and course_id is not null)
  or (scope = 'selection' and course_id is not null
      and lesson_ids is not null and array_length(lesson_ids, 1) >= 1)
);

create or replace function public.match_course_chunks(
  query_embedding vector,
  course_id_filter uuid,
  top_k integer default 8,
  lesson_ids_filter uuid[] default null
)
returns table(id uuid, lesson_id uuid, content text, similarity double precision)
language sql
stable
set search_path to ''
as $function$
  select
    c.id,
    c.lesson_id,
    c.content,
    1 - (c.embedding operator(extensions.<=>) query_embedding) as similarity
  from public.lesson_chunks c
  join public.lessons l on l.id = c.lesson_id
  where l.course_id = course_id_filter
    and c.embedding is not null
    and (lesson_ids_filter is null or c.lesson_id = any(lesson_ids_filter))
  order by c.embedding operator(extensions.<=>) query_embedding
  limit top_k;
$function$;
