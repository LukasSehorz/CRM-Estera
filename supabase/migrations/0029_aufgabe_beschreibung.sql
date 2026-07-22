-- =====================================================================
-- 0029 — Aufgaben-Beschreibung (Kunden-Feedback 22.07.): optionales Freitext-
-- Feld unter dem Titel; in der Liste per Dropdown sichtbar.
-- =====================================================================

alter table public.tasks add column if not exists beschreibung text;
