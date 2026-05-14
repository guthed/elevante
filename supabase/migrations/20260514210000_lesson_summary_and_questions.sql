-- Lägg till AI-genererade fält på lessons. Fylls i av transcribe-lesson
-- Edge Function efter att chunking + embeddings är klara.

alter table public.lessons
  add column if not exists summary text,
  add column if not exists suggested_questions jsonb not null default '[]'::jsonb,
  add column if not exists ai_generated_topic text;

-- Indikator för att läsfrågor lätt kan hitta lektioner som behöver backfill
create index if not exists lessons_summary_missing_idx
  on public.lessons (id)
  where summary is null and transcript_status = 'ready';

comment on column public.lessons.summary is
  'AI-genererad sammanfattning (3-5 meningar) — visas i student-vyn istället för råtranskriptet.';
comment on column public.lessons.suggested_questions is
  'Exakt 2 startfrågor som hjälper eleven börja chatta — JSON-array av strängar.';
comment on column public.lessons.ai_generated_topic is
  'Kort ämnesfras (max 6 ord) som används som ingrediens i lessons.title.';
