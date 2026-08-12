alter table public.profiles
  add column if not exists is_staff boolean not null default false;

comment on column public.profiles.is_staff is
  'Elevante-personal (inte en kunds egen admin). Gate:ar /admin/skolor, /admin/crm, /admin/intresse och bootstrap av en ny skolas första admin.';
