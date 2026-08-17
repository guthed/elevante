-- Kunskapsträning före prov — Foundation.
--
-- training_materials: ett träningsunderlag per lektion, genererat EN gång i
-- transcribe-lesson-pipelinen (aldrig per elev/klick). jsonb-kolumner följer
-- samma konvention som class_tests.questions.
--
-- flashcard_review_state / knowledge_check_attempts: per elev × item. Ingen rad
-- skapas förrän eleven faktiskt tränat på itemet — nya kort kräver ingen backfill.

create table if not exists public.training_materials (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  lesson_id uuid not null unique references public.lessons(id) on delete cascade,
  concepts jsonb not null default '[]'::jsonb,
  flashcards jsonb not null default '[]'::jsonb,
  knowledge_checks jsonb not null default '[]'::jsonb,
  model_version text,
  generated_at timestamptz not null default now()
);

comment on column public.training_materials.concepts is
  '[{id, name, definition, example, misconception}]';
comment on column public.training_materials.flashcards is
  '[{id, concept_id, front, back}]';
comment on column public.training_materials.knowledge_checks is
  '[{id, concept_id, question, choices: string[], correct_index, explanation}]';

create table if not exists public.flashcard_review_state (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  flashcard_id uuid not null,
  ease_factor real not null default 2.5,
  interval_days integer not null default 0,
  repetitions integer not null default 0,
  due_at timestamptz not null default now(),
  last_reviewed_at timestamptz,
  last_grade text check (last_grade in ('again','hard','good')),
  unique (student_id, flashcard_id)
);

create index if not exists flashcard_review_state_due_idx
  on public.flashcard_review_state (student_id, due_at);

create table if not exists public.knowledge_check_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  knowledge_check_id uuid not null,
  correct boolean not null,
  answered_at timestamptz not null default now()
);

create index if not exists knowledge_check_attempts_student_idx
  on public.knowledge_check_attempts (student_id, answered_at desc);

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  mode text not null check (mode in ('flashcards','knowledge_checks')),
  lesson_ids uuid[] not null,
  item_ids uuid[] not null,
  created_at timestamptz not null default now()
);

create index if not exists training_sessions_student_idx
  on public.training_sessions (student_id, created_at desc);

alter table public.training_materials enable row level security;
alter table public.flashcard_review_state enable row level security;
alter table public.knowledge_check_attempts enable row level security;
alter table public.training_sessions enable row level security;

-- training_materials: läsbart för alla i samma skola (samma nivå som
-- lessons_select_same_school). Ingen skrivpolicy — bara service-role skriver.
create policy "training_materials_select_same_school" on public.training_materials
  for select to authenticated
  using (school_id = public.current_school_id());

-- Progress-tabeller: eleven äger sina egna rader, helt privat.
create policy "flashcard_review_state_own_select" on public.flashcard_review_state
  for select to authenticated
  using (student_id = (select auth.uid()));
create policy "flashcard_review_state_own_insert" on public.flashcard_review_state
  for insert to authenticated
  with check (student_id = (select auth.uid()));
create policy "flashcard_review_state_own_update" on public.flashcard_review_state
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

create policy "knowledge_check_attempts_own_select" on public.knowledge_check_attempts
  for select to authenticated
  using (student_id = (select auth.uid()));
create policy "knowledge_check_attempts_own_insert" on public.knowledge_check_attempts
  for insert to authenticated
  with check (student_id = (select auth.uid()));

create policy "training_sessions_own_select" on public.training_sessions
  for select to authenticated
  using (student_id = (select auth.uid()));
create policy "training_sessions_own_insert" on public.training_sessions
  for insert to authenticated
  with check (student_id = (select auth.uid()));
