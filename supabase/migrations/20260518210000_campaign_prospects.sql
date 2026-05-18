-- Kampanj: prisförfrågningar (rå logg) + anrikade skol-prospekt.
-- Globala tabeller. Service role skriver; admin läser.

create table public.school_lookups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  school_unit_code text not null,
  school_name text not null,
  students integer,
  price_sek integer,
  locale text not null,
  lead_email text,
  lead_message text
);

create table public.school_prospects (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  school_unit_code text not null unique,
  school_name text not null,
  contact_address text,
  contact_phone text,
  contact_email text,
  contact_web text,
  municipality text,
  principal_type text,
  huvudman_name text,
  school_orientation text,
  students integer,
  ai_brief text,
  enrichment_status text not null default 'pending',
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  lookup_count integer not null default 1,
  latest_lead_email text,
  latest_lead_message text,
  latest_lead_at timestamptz,
  notion_page_id text
);

create index school_lookups_created_at_idx on public.school_lookups (created_at desc);
create index school_lookups_school_idx on public.school_lookups (school_unit_code);
create index school_prospects_last_seen_idx on public.school_prospects (last_seen_at desc);

alter table public.school_lookups enable row level security;
alter table public.school_prospects enable row level security;

-- Inga insert/update-policys: service role kringgår RLS.
create policy "school_lookups_admin_read" on public.school_lookups
  for select to authenticated using (public.current_user_role() = 'admin');
create policy "school_prospects_admin_read" on public.school_prospects
  for select to authenticated using (public.current_user_role() = 'admin');
