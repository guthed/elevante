-- Delningar från /try (tipsa en kollega). Primär logg + rate-limit-underlag.
create table if not exists public.try_shares (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null,
  sender_email text not null,
  recipient_email text not null,
  message text,
  locale text not null default 'sv',
  ip text,
  created_at timestamptz not null default now()
);

-- Bara service-role (kringgår RLS) skriver/läser. Ingen publik access.
alter table public.try_shares enable row level security;

create index if not exists try_shares_created_at_idx on public.try_shares (created_at desc);
create index if not exists try_shares_ip_created_idx on public.try_shares (ip, created_at desc);
