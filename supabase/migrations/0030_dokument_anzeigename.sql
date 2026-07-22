-- =====================================================================
-- 0030 — Expliziter Anzeigename je Dokument (Kunden-Feedback 22.07.):
-- Bei Slots mit mehreren Dokumentarten (z. B. „Personalausweis / Reisepass +
-- Aufenthaltstitel") wählt man beim Hochladen die konkrete Art; sie wird hier
-- gespeichert. Ist NULL, wird der Name aus dem Slot-Typ abgeleitet (wie bisher).
-- =====================================================================

alter table public.contact_documents add column if not exists anzeigename text;
