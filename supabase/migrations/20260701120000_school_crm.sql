-- Skol-CRM: outbound-fält på school_prospects + ops-logg.
alter table public.school_prospects
  add column if not exists skolform text[],
  add column if not exists created_via text not null default 'inbound_lookup',
  add column if not exists last_synced_at timestamptz,
  add column if not exists sync_status text,
  add column if not exists sync_error text;

create table if not exists public.school_sync_log (
  id uuid primary key default gen_random_uuid(),
  synced_at timestamptz not null default now(),
  school_unit_code text not null,
  status text not null,
  duration_ms integer,
  error text
);

create index if not exists school_sync_log_synced_at_idx
  on public.school_sync_log (synced_at desc);

alter table public.school_sync_log enable row level security;

-- Service role kringgår RLS; admin läser.
create policy "school_sync_log_admin_read" on public.school_sync_log
  for select to authenticated using (public.current_user_role() = 'admin');
