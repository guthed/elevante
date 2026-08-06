-- Rivning av lärardemon för Amerikanska gymnasiet (seedad 2026-08-04).
--
-- Demon är TILLFÄLLIG — ett onboarding-verktyg för att bekanta fyra lärare
-- och tre från skolledningen med Elevante ur elevperspektiv inför piloten.
-- Kör det här när piloten startar på riktigt, eller när de ska flyttas till
-- riktiga konton.
--
-- Spec: docs/superpowers/specs/2026-08-04-amerikanska-larardemo-design.md
--
-- Kör via Supabase MCP execute_sql eller SQL-editorn.
--
-- Ordningen spelar roll:
--   1. auth.users kaskaderar till public.profiles
--      (profiles.school_id är `on delete set null`, så att bara radera skolan
--      lämnar kontona kvar som föräldralösa — därför tas de bort först)
--   2. schools kaskaderar till courses, classes, class_members, lessons,
--      lesson_chunks, chats, chat_messages och practice_tests

-- ---------------------------------------------------------------------------
-- STEG 1: Kontona (fyra lärare-som-elever + John som lärare)
--
-- Vill du behålla john@elevante.se — t.ex. för att återanvända kontot i
-- piloten — ta bort den raden ur listan. Kontot blir då kvar men utan skola
-- (profiles.school_id nollas när skolan raderas i steg 2).
-- ---------------------------------------------------------------------------
delete from auth.users
where email in (
  -- Lärare (seedade 2026-08-04)
  'ellen.lang@amerikanskagymnasiet.se',
  'alfred.plars@amerikanskagymnasiet.se',
  'james.pratt@amerikanskagymnasiet.se',
  'emma.good@amerikanskagymnasiet.se',
  -- Skolledning (tillagda 2026-08-04, samma åtkomst som lärarna)
  'peter.heddelin@amerikanskagymnasiet.se',
  'erica.nordmark@amerikanskagymnasiet.se',
  'joel.filipp@amerikanskagymnasiet.se',
  -- Lärarkonto för insiktsvyn
  'john@elevante.se'
);

-- ---------------------------------------------------------------------------
-- STEG 2: Skolan — allt innehåll kaskaderar härifrån
-- ---------------------------------------------------------------------------
delete from public.schools
where slug = 'amerikanska-gymnasiet';

-- ---------------------------------------------------------------------------
-- Kontroll: båda ska returnera 0
-- ---------------------------------------------------------------------------
select
  (select count(*) from public.schools where slug = 'amerikanska-gymnasiet') as skolor_kvar,
  (select count(*) from auth.users where email like '%amerikanskagymnasiet.se') as konton_kvar;
