-- Profilbild för inloggad användare: ladda upp, byt ut, ta bort.
-- avatar_url pekar på en fil i en publik Storage-bucket (låg känslighet,
-- samma mönster som andra SaaS-produkter) strukturerad som
-- <user_id>/avatar.<ext> — en fil per användare, uppladdning skriver
-- över (upsert) istället för att ackumulera gamla filer.

alter table public.profiles add column avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'elevante-avatars',
  'elevante-avatars',
  true,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

create policy "elevante_avatars_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'elevante-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "elevante_avatars_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'elevante-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'elevante-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "elevante_avatars_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'elevante-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
