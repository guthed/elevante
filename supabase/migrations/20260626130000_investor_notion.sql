-- Notion blir master för investerarkoder. invite får notion_page_id (nyckel),
-- code-unikheten släpps (koden lever i Notion nu). Nya RPC:er för upsert,
-- rollup och cache-fallback. verify_investor_code utgår.

alter table public.investor_invites add column if not exists notion_page_id text;
alter table public.investor_invites drop constraint if exists investor_invites_code_key;
create unique index if not exists investor_invites_notion_page_id_key
  on public.investor_invites(notion_page_id);

create or replace function public.upsert_investor_invite(
  p_notion_page_id text, p_label text, p_code text
) returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  insert into public.investor_invites (notion_page_id, label, code)
  values (p_notion_page_id, p_label, p_code)
  on conflict (notion_page_id) do update
    set label = excluded.label, code = excluded.code
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.get_investor_rollup(p_notion_page_id text)
returns table (max_scroll int, reached_ask boolean, last_seen timestamptz, sessions int)
language sql security definer set search_path = public
as $$
  select
    coalesce(max(v.max_scroll_pct), 0)::int,
    coalesce(bool_or(v.reached_ask), false),
    max(v.last_seen_at),
    count(*)::int
  from public.investor_deck_views v
  join public.investor_invites i on i.id = v.invite_id
  where i.notion_page_id = p_notion_page_id;
$$;

create or replace function public.get_cached_invite_by_code(p_code text)
returns table (notion_page_id text, label text)
language sql security definer set search_path = public
as $$
  select i.notion_page_id, i.label
  from public.investor_invites i
  where i.code = p_code and i.notion_page_id is not null
  limit 1;
$$;

drop function if exists public.verify_investor_code(text);

grant execute on function public.upsert_investor_invite(text, text, text) to anon, authenticated;
grant execute on function public.get_investor_rollup(text) to anon, authenticated;
grant execute on function public.get_cached_invite_by_code(text) to anon, authenticated;
