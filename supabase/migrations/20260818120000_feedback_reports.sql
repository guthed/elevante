-- Elevrapportering — elever rapporterar app-problem direkt i appen.
--
-- Supabase är sanningen, Notion är arbetsytan: raden skrivs här först och
-- synkas sedan best-effort till 💬 Elevante – Elevfeedback via after().
-- notion_page_id fylls i av synken när den lyckas; null betyder att raden
-- finns men aldrig nådde Notion (då är den här tabellen enda kopian).
--
-- Notion får ALDRIG namn eller mejl — bara klass, skola, lektion, kontext och
-- en ogenomskinlig Elevreferens härledd ur student_id. Kopplingen referens →
-- elev finns bara här, i EU.

create table if not exists public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  category text not null check (category in ('not_working', 'confused', 'looks_wrong')),
  message text,
  surface text not null,
  lesson_id uuid references public.lessons(id) on delete set null,
  context jsonb not null default '{}'::jsonb,
  notion_page_id text,
  created_at timestamptz not null default now()
);

comment on table public.feedback_reports is
  'Elevrapporter om APPEN (inte om ämnet). Skrivs av eleven själv; lärare och '
  'admin i samma skola läser dem. Notion-kopian är pseudonym — uppslag av vem '
  'som rapporterat sker via student_id här.';
comment on column public.feedback_reports.category is
  'Elevens enda obligatoriska bidrag: not_working | confused | looks_wrong.';
comment on column public.feedback_reports.surface is
  'Var i appen rapporten skickades, som stabil nyckel (t.ex. training_flashcards). '
  'Mappas till Notions "Var i appen"-select i lib/feedback/surface.ts.';
comment on column public.feedback_reports.context is
  'Automatiskt bifogat underlag: sida, kort-/frågeid, begrepp, kurs, klass. '
  'Formen får växa — läsare ska tåla saknade nycklar.';

create index if not exists feedback_reports_school_idx
  on public.feedback_reports (school_id, created_at desc);
create index if not exists feedback_reports_student_idx
  on public.feedback_reports (student_id, created_at desc);

alter table public.feedback_reports enable row level security;

-- Eleven får skriva sina EGNA rader, i sin egen skola. Ingen select-policy för
-- eleven: en rapport är inte något man ska kunna läsa tillbaka (och absolut
-- inte andras).
create policy "feedback_reports_own_insert" on public.feedback_reports
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and school_id = public.current_school_id()
  );

-- Lärare och admin i samma skola läser rapporterna — de är uppföljningsvägen
-- under piloten.
create policy "feedback_reports_staff_select" on public.feedback_reports
  for select to authenticated
  using (
    school_id = public.current_school_id()
    and public.current_user_role() in ('teacher', 'admin')
  );
