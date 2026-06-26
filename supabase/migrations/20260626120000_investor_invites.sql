-- Investerardeck: en kod per investerare + läs-spårning.
-- Båda tabellerna RLS-låsta; all åtkomst via security-definer-RPC:erna nedan.

create table if not exists public.investor_invites (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  code text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.investor_deck_views (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.investor_invites(id) on delete cascade,
  session_id text not null unique,
  locale text not null default 'sv',
  opened_at timestamptz not null default now(),
  last_seen_at timestamptz,
  max_scroll_pct int not null default 0,
  seconds int not null default 0,
  reached_ask boolean not null default false,
  notified_open boolean not null default false,
  notified_ask boolean not null default false
);

create index if not exists investor_deck_views_invite_idx
  on public.investor_deck_views(invite_id);

alter table public.investor_invites enable row level security;
alter table public.investor_deck_views enable row level security;
-- Inga policys = ingen anon/authenticated-åtkomst. Endast RPC:erna nedan.

create or replace function public.verify_investor_code(p_code text)
returns table (invite_id uuid, label text)
language sql
security definer
set search_path = public
as $$
  select i.id, i.label
  from public.investor_invites i
  where i.code = p_code and i.active
  limit 1;
$$;

create or replace function public.record_investor_open(
  p_invite_id uuid, p_session_id text, p_locale text
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.investor_deck_views (invite_id, session_id, locale, last_seen_at)
  values (p_invite_id, p_session_id, coalesce(p_locale, 'sv'), now())
  on conflict (session_id) do nothing;
$$;

create or replace function public.mark_investor_notified(p_session_id text, p_kind text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.investor_deck_views
  set notified_open = case when p_kind = 'open' then true else notified_open end
  where session_id = p_session_id;
$$;

create or replace function public.record_investor_engagement(
  p_session_id text, p_max_scroll int, p_seconds int, p_reached_ask boolean
) returns table (newly_reached_ask boolean, label text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_was_notified boolean;
  v_invite uuid;
  v_label text := null;
  v_newly boolean := false;
begin
  select v.notified_ask, v.invite_id into v_was_notified, v_invite
  from public.investor_deck_views v
  where v.session_id = p_session_id
  for update;

  if not found then
    return;
  end if;

  update public.investor_deck_views v
  set
    max_scroll_pct = greatest(v.max_scroll_pct, coalesce(p_max_scroll, 0)),
    seconds        = greatest(v.seconds, coalesce(p_seconds, 0)),
    last_seen_at   = now(),
    reached_ask    = v.reached_ask or coalesce(p_reached_ask, false),
    notified_ask   = v.notified_ask or coalesce(p_reached_ask, false)
  where v.session_id = p_session_id;

  v_newly := coalesce(p_reached_ask, false) and not coalesce(v_was_notified, false);
  if v_newly then
    select i.label into v_label from public.investor_invites i where i.id = v_invite;
  end if;

  newly_reached_ask := v_newly;
  label := v_label;
  return next;
end;
$$;

grant execute on function public.verify_investor_code(text) to anon, authenticated;
grant execute on function public.record_investor_open(uuid, text, text) to anon, authenticated;
grant execute on function public.mark_investor_notified(text, text) to anon, authenticated;
grant execute on function public.record_investor_engagement(text, int, int, boolean) to anon, authenticated;
