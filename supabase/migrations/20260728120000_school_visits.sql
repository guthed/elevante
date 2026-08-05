-- Skolbesök: personlig länk per prospect (?k=<kod>) + läs-spårning på
-- säljsidorna /rektor och /larare.
--
-- Samma mönster som investor_invites/investor_deck_views, men kopplat till den
-- befintliga CRM-raden i school_prospects i stället för en egen invite-tabell.
-- Tabellen är RLS-låst: skrivning sker bara via security-definer-RPC:erna nedan
-- (anropade från route handlers), läsning bara av admin.

alter table public.school_prospects
  add column if not exists visit_code text;

create unique index if not exists school_prospects_visit_code_key
  on public.school_prospects (visit_code)
  where visit_code is not null;

create table if not exists public.school_page_views (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid not null references public.school_prospects(id) on delete cascade,
  session_id text not null unique,
  page text not null,
  opened_at timestamptz not null default now(),
  last_seen_at timestamptz,
  max_scroll_pct int not null default 0,
  seconds int not null default 0,
  notified_open boolean not null default false
);

create index if not exists school_page_views_prospect_idx
  on public.school_page_views (prospect_id, opened_at desc);

alter table public.school_page_views enable row level security;

-- Inga insert/update-policys: service role kringgår RLS, RPC:erna är security
-- definer. Admin får läsa för CRM-vyn, i linje med school_prospects.
create policy "school_page_views_admin_read" on public.school_page_views
  for select to authenticated using (public.current_user_role() = 'admin');

-- Slår upp en besökskod. Returnerar inget för koder som inte finns.
create or replace function public.verify_school_visit_code(p_code text)
returns table (prospect_id uuid, school_name text, notion_page_id text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.school_name, p.notion_page_id
  from public.school_prospects p
  where p.visit_code = p_code
  limit 1;
$$;

-- Registrerar en öppning. `is_new_visit` är false om samma prospect redan haft
-- en session de senaste 30 minuterna — så att en omladdning mitt i läsningen
-- inte genererar ett nytt mejl.
create or replace function public.record_school_visit_open(
  p_prospect_id uuid, p_session_id text, p_page text
) returns table (is_new_visit boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recent boolean;
begin
  select exists (
    select 1 from public.school_page_views
    where prospect_id = p_prospect_id
      and opened_at > now() - interval '30 minutes'
  ) into v_recent;

  insert into public.school_page_views (prospect_id, session_id, page, last_seen_at)
  values (p_prospect_id, p_session_id, coalesce(p_page, 'rektor'), now())
  on conflict (session_id) do nothing;

  return query select not v_recent;
end;
$$;

create or replace function public.mark_school_visit_notified(p_session_id text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.school_page_views
  set notified_open = true
  where session_id = p_session_id;
$$;

-- Scroll och tid räknas monotont uppåt: en sen beacon får aldrig sänka värdet.
create or replace function public.record_school_visit_engagement(
  p_session_id text, p_max_scroll int, p_seconds int
) returns void
language sql
security definer
set search_path = public
as $$
  update public.school_page_views
  set max_scroll_pct = greatest(max_scroll_pct, coalesce(p_max_scroll, 0)),
      seconds = greatest(seconds, coalesce(p_seconds, 0)),
      last_seen_at = now()
  where session_id = p_session_id;
$$;

create or replace function public.get_school_visit_rollup(p_prospect_id uuid)
returns table (
  max_scroll int, last_seen timestamptz, sessions int, total_seconds int, pages text
)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(max(v.max_scroll_pct), 0)::int,
    max(coalesce(v.last_seen_at, v.opened_at)),
    count(*)::int,
    coalesce(sum(v.seconds), 0)::int,
    string_agg(distinct v.page, ', ' order by v.page)
  from public.school_page_views v
  where v.prospect_id = p_prospect_id;
$$;
