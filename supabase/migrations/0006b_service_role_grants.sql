-- =====================================================================
-- 0006b — Grants für service_role (Fund aus Phase 10)
-- Unsere Tabellen wurden per SQL angelegt, daher fehlen der service_role
-- die Standard-Grants. Sie werden für Admin-Aufgaben der App gebraucht
-- (z. B. Berater-Anlage über die Team-Verwaltung). RLS gilt für die
-- service_role ohnehin nicht (bypassrls) — es geht nur um Tabellenrechte.
-- =====================================================================
grant usage on schema public to service_role;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
