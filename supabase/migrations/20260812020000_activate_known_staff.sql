-- Aktiverar is_staff för de kända Elevante-kontona i prod, direkt efter
-- att kolumnen finns (20260811130000_admin_staff_flag.sql) och skyddet
-- mot self-escalation finns (20260812000000_..._prospect_rls.sql).
--
-- Körs som en vanlig migration (privilegierad anslutning, ingen JWT) —
-- protect_is_staff()-triggern kollar auth.role() <> 'service_role', och
-- auth.role() är null i migrationskontext, så villkoret blir null/falskt
-- och triggern blockerar inte detta (samma väg som manuell SQL i
-- Studio redan är tänkt att fungera, se kommentaren i triggerns egen
-- migration).
--
-- Enda admin-kontot i prod just nu (verifierat via read-only SELECT
-- 2026-08-12) är john@guthed.se, kopplat till DEMOSKOLAN — allt annat är
-- elev-/lärarkonton under DEMOSKOLAN eller Amerikanska gymnasiet, inga
-- fler admins. Om fler Elevante-konton tillkommer senare, kör samma
-- UPDATE manuellt för dem (ingen UI för detta ännu).
update public.profiles
set is_staff = true
where email = 'john@guthed.se';
