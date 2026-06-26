-- Lägg total aktiv tid (sekunder) i rollup-funktionen så Notion-dashboarden
-- kan visa "Tid på sidan". Summa över alla sessioner per investerare.
drop function if exists public.get_investor_rollup(text);

create function public.get_investor_rollup(p_notion_page_id text)
returns table (max_scroll int, reached_ask boolean, last_seen timestamptz, sessions int, total_seconds int)
language sql security definer set search_path = public
as $$
  select
    coalesce(max(v.max_scroll_pct), 0)::int,
    coalesce(bool_or(v.reached_ask), false),
    max(v.last_seen_at),
    count(*)::int,
    coalesce(sum(v.seconds), 0)::int
  from public.investor_deck_views v
  join public.investor_invites i on i.id = v.invite_id
  where i.notion_page_id = p_notion_page_id;
$$;

grant execute on function public.get_investor_rollup(text) to anon, authenticated;
