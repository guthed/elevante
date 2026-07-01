-- Cachar det AI-genererade kontaktmejlet så det bara skrivs en gång.
alter table public.school_prospects
  add column if not exists contact_email_draft text;
