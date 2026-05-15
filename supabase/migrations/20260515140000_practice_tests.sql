-- Testprov i Provplugg: AI-genererade övningsprov per lektionsurval.
--
-- Eleven väljer lektioner i Provplugg och genererar ett prov — flerval,
-- kortsvar, öppna och resonerande frågor. Provet fylls i på Elevante och
-- rättas: flerval i kod, övriga av Claude mot facit. Eleven får poäng +
-- kvalitativ feedback per fråga.
--
-- Hela provet (frågor) och inlämningen (svar + feedback) ligger som jsonb
-- på en rad — ett prov är en självständig enhet, inga joins behövs.
-- RLS: bara eleven själv ser sina prov.

create table if not exists public.practice_tests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_ids uuid[] not null,
  status text not null default 'generated' check (status in ('generated','graded')),
  questions jsonb not null default '[]'::jsonb,
  submission jsonb,
  score integer,
  max_score integer not null default 0,
  created_at timestamptz not null default now(),
  submitted_at timestamptz
);

create index if not exists practice_tests_user_idx
  on public.practice_tests (user_id, created_at desc);

alter table public.practice_tests enable row level security;

create policy "practice_tests_owner_select" on public.practice_tests
  for select to authenticated using (user_id = (select auth.uid()));
create policy "practice_tests_owner_insert" on public.practice_tests
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "practice_tests_owner_update" on public.practice_tests
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "practice_tests_owner_delete" on public.practice_tests
  for delete to authenticated using (user_id = (select auth.uid()));
