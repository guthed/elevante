-- Ny chat-scope: 'selection' — en chat som spänner ett urval av lektioner.
--
-- Används av Provplugg-funktionen: eleven väljer flera lektioner i en kurs
-- (t.ex. inför ett prov) och chattar mot just dem, inte hela kursen.
--
-- ALTER TYPE ... ADD VALUE måste ligga i en egen migration, separat från
-- statements som använder värdet — Postgres tillåter inte att ett nytt
-- enum-värde används i samma transaktion som det läggs till.

alter type public.chat_scope add value if not exists 'selection';
