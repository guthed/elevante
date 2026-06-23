-- Klassprov: lärar-författade prov tilldelade en klass.
--
-- class_tests = provdefinitionen (lärar-ägd, en rad). class_test_submissions =
-- en rad per elev. Facit ligger i questions-jsonb; elever läser ALDRIG tabellen
-- direkt utan via security-definer-RPC:er som strippar facit och håller
-- resultatet dolt tills läraren släppt (status='released').

create table if not exists public.class_tests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  lesson_ids uuid[] not null,
  composition jsonb not null default '{}'::jsonb,
  questions jsonb not null default '[]'::jsonb,
  max_score integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','closed')),
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create index if not exists class_tests_class_idx
  on public.class_tests (class_id, created_at desc);

create table if not exists public.class_test_submissions (
  id uuid primary key default gen_random_uuid(),
  class_test_id uuid not null references public.class_tests(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  answers jsonb not null default '[]'::jsonb,
  score integer not null default 0,
  max_score integer not null default 0,
  overall_feedback text not null default '',
  status text not null default 'graded' check (status in ('graded','released')),
  submitted_at timestamptz not null default now(),
  graded_at timestamptz,
  released_at timestamptz,
  unique (class_test_id, student_id)
);

create index if not exists class_test_submissions_test_idx
  on public.class_test_submissions (class_test_id);

alter table public.class_tests enable row level security;
alter table public.class_test_submissions enable row level security;

-- class_tests: bara lärare/admin i samma skola, full CRUD på egna prov.
-- Elever har INGEN direkt SELECT (läser via RPC).
create policy "class_tests_teacher_select" on public.class_tests
  for select to authenticated
  using (
    public.current_user_role() in ('teacher','admin')
    and school_id = public.current_school_id()
  );
create policy "class_tests_teacher_insert" on public.class_tests
  for insert to authenticated
  with check (
    public.current_user_role() in ('teacher','admin')
    and school_id = public.current_school_id()
    and created_by = (select auth.uid())
  );
create policy "class_tests_teacher_update" on public.class_tests
  for update to authenticated
  using (
    public.current_user_role() in ('teacher','admin')
    and school_id = public.current_school_id()
  )
  with check (
    public.current_user_role() in ('teacher','admin')
    and school_id = public.current_school_id()
  );
create policy "class_tests_teacher_delete" on public.class_tests
  for delete to authenticated
  using (
    public.current_user_role() in ('teacher','admin')
    and school_id = public.current_school_id()
  );

-- submissions: eleven ser/skapar/ändrar sin egen rad; lärare/admin i samma
-- skola ser alla rader för sina prov och kan uppdatera (rätta/släppa).
create policy "class_test_submissions_student_select" on public.class_test_submissions
  for select to authenticated
  using (student_id = (select auth.uid()));
create policy "class_test_submissions_student_insert" on public.class_test_submissions
  for insert to authenticated
  with check (student_id = (select auth.uid()));
create policy "class_test_submissions_teacher_select" on public.class_test_submissions
  for select to authenticated
  using (
    public.current_user_role() in ('teacher','admin')
    and school_id = public.current_school_id()
  );
create policy "class_test_submissions_teacher_update" on public.class_test_submissions
  for update to authenticated
  using (
    public.current_user_role() in ('teacher','admin')
    and school_id = public.current_school_id()
  )
  with check (
    public.current_user_role() in ('teacher','admin')
    and school_id = public.current_school_id()
  );

-- RPC: hämta publicerat prov till en elev i klassen, med facit strippat.
create or replace function public.get_published_class_test(p_test_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.class_tests;
  v_questions jsonb;
begin
  select * into v_row from public.class_tests
  where id = p_test_id and status = 'published';
  if not found then
    return null;
  end if;

  if not exists (
    select 1 from public.class_members m
    where m.class_id = v_row.class_id and m.profile_id = auth.uid()
  ) then
    return null;
  end if;

  select jsonb_agg(
    (q - 'answer_key' - 'correct_index')
  )
  into v_questions
  from jsonb_array_elements(v_row.questions) q;

  return jsonb_build_object(
    'id', v_row.id,
    'title', v_row.title,
    'class_id', v_row.class_id,
    'max_score', v_row.max_score,
    'questions', coalesce(v_questions, '[]'::jsonb)
  );
end;
$$;

-- RPC: elevens eget resultat — bara om läraren släppt det.
create or replace function public.get_my_submission_result(p_submission_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.class_test_submissions;
begin
  select * into v_row from public.class_test_submissions
  where id = p_submission_id
    and student_id = auth.uid()
    and status = 'released';
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'class_test_id', v_row.class_test_id,
    'answers', v_row.answers,
    'score', v_row.score,
    'max_score', v_row.max_score,
    'overall_feedback', v_row.overall_feedback,
    'released_at', v_row.released_at
  );
end;
$$;

-- RPC: fulla frågor (med facit) för rättning vid inlämning. Bara för publicerat
-- prov där anroparen är klassmedlem. Anropas enbart server-side i submit-flödet.
create or replace function public.get_class_test_for_grading(p_test_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.class_tests;
begin
  select * into v_row from public.class_tests
  where id = p_test_id and status = 'published';
  if not found then
    return null;
  end if;
  if not exists (
    select 1 from public.class_members m
    where m.class_id = v_row.class_id and m.profile_id = auth.uid()
  ) then
    return null;
  end if;
  return jsonb_build_object(
    'questions', v_row.questions,
    'school_id', v_row.school_id,
    'max_score', v_row.max_score
  );
end;
$$;

grant execute on function public.get_published_class_test(uuid) to authenticated;
grant execute on function public.get_my_submission_result(uuid) to authenticated;
grant execute on function public.get_class_test_for_grading(uuid) to authenticated;
