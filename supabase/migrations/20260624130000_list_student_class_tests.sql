-- Elevens klassprov-lista utan facit. Elever saknar direkt SELECT på
-- class_tests (RLS) — denna security-definer-RPC returnerar bara
-- publicerade/stängda prov i elevens egna klasser, utan questions/facit.

create or replace function public.list_student_class_tests()
returns table (
  id uuid,
  title text,
  status text,
  class_name text,
  published_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select ct.id, ct.title, ct.status, c.name, ct.published_at
  from public.class_tests ct
  join public.classes c on c.id = ct.class_id
  where ct.status in ('published','closed')
    and exists (
      select 1 from public.class_members m
      where m.class_id = ct.class_id
        and m.profile_id = auth.uid()
    )
  order by ct.published_at desc nulls last;
$$;

grant execute on function public.list_student_class_tests() to authenticated;
