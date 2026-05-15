-- Markör för demo-genererade (syntetiska) lektioner.
--
-- För pilot-demon behöver vi en fylld Ekologi-kurs (8 lektioner, 2/vecka i
-- 4 veckor). Bara 2 är äkta inspelningar — resten är AI-genererade transkript.
-- is_synthetic gör att vi (a) vet vilka som är genererade och (b) kan filtrera
-- bort dem innan en riktig pilotskola släpps på. Hellre tydligt syntetiskt än
-- låtsas-äkta — samma princip som när Nacka-referenserna rensades.

alter table public.lessons
  add column if not exists is_synthetic boolean not null default false;

comment on column public.lessons.is_synthetic is
  'True för demo-genererade lektioner. Får aldrig visas för riktig pilotskola som äkta inspelningar.';
