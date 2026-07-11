-- Lokal spårning av när kontaktmejlet släpptes från CRM:et (Typ 1).
-- Notion Status='Kontaktad' är källan för människor; denna kolumn styr knappens
-- inaktivering utan att läsa Notion per rad.
alter table public.school_prospects
  add column if not exists contacted_at timestamptz;
