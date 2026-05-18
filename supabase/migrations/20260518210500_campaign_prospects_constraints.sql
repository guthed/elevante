-- Följdmigration: CHECK på enrichment_status + updated_at-trigger.
alter table public.school_prospects
  add constraint school_prospects_enrichment_status_check
  check (enrichment_status in ('pending', 'done', 'failed'));

create trigger school_prospects_touch_updated_at
before update on public.school_prospects
for each row execute function public.touch_updated_at();
