-- Elevante: mjuk radering av lektioner.
-- archived_at = null betyder aktiv. Sätts vid arkivering, nollställs vid återställning.
alter table public.lessons
  add column if not exists archived_at timestamptz;
