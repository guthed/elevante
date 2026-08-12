-- Backfyllnad: redan applicerad mot prod (msqfuywpbrteyrzjggsw, version
-- 20260701215322) men saknade lokal fil. Transkriberad från
-- supabase_migrations.schema_migrations.statements 2026-08-12 under
-- utredningen av school-provisioning-grenens migrationskonflikt.
alter table public.school_prospects
  add column if not exists contacted_at timestamptz;
