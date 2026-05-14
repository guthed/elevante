-- Koncept-fält på lektioner (5-8 strängar, AI-extraherade)
alter table public.lessons
  add column if not exists concepts jsonb not null default '[]'::jsonb;

-- Koncept-fält på chat-meddelanden (1-3 strängar, AI-taggat vid RAG-svar)
alter table public.chat_messages
  add column if not exists concepts jsonb not null default '[]'::jsonb;

-- Engagemang-spårning: när en elev öppnar en lektion
create table if not exists public.lesson_views (
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  first_viewed_at timestamptz not null default now(),
  last_viewed_at timestamptz not null default now(),
  view_count integer not null default 1,
  primary key (lesson_id, profile_id)
);
create index if not exists lesson_views_lesson_idx on public.lesson_views(lesson_id);

alter table public.lesson_views enable row level security;

-- Studenten ser sina egna views
create policy "lesson_views_self_select"
  on public.lesson_views for select
  to authenticated
  using (profile_id = (select auth.uid()));

-- Lärare/admin ser views på lektioner i sin egen skola
create policy "lesson_views_school_select"
  on public.lesson_views for select
  to authenticated
  using (
    public.current_user_role() in ('teacher', 'admin')
    and exists (
      select 1 from public.lessons l
      where l.id = lesson_views.lesson_id
        and l.school_id = public.current_school_id()
    )
  );

-- Eleven kan upserta sin egen view
create policy "lesson_views_self_insert"
  on public.lesson_views for insert
  to authenticated
  with check (profile_id = (select auth.uid()));

create policy "lesson_views_self_update"
  on public.lesson_views for update
  to authenticated
  using (profile_id = (select auth.uid()))
  with check (profile_id = (select auth.uid()));

comment on column public.lessons.concepts is
  'AI-extraherade koncept från lektionen (4-10 strängar). Används för heatmap-kolumner.';
comment on column public.chat_messages.concepts is
  'AI-taggade koncept för detta meddelande (0-3 strängar, subset av lessons.concepts).';
comment on table public.lesson_views is
  'Engagemangs-spårning: vilka elever har öppnat vilka lektioner och hur många gånger.';
