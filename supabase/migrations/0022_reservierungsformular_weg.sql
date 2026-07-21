-- =====================================================================
-- 0022 — Dokumenttyp „Reservierungsformular" entfernen (Call SJ Fine-Tuning)
-- Der Kunde will nur noch „Reservierungsvereinbarung" in der Checkliste; das
-- zusätzliche „Reservierungsformular" (in 0015 eingefügt) fällt weg.
-- DEAKTIVIEREN statt LÖSCHEN: contact_document_status.document_type_id ist ein
-- FK ohne on-delete-Regel — ein hartes DELETE würde abbrechen, sobald irgendein
-- Kontakt diesen Punkt je an-/abgehakt hat. `aktiv = false` blendet den Typ
-- überall aus (die Views laden nur `.eq("aktiv", true)`), ohne Datenverlust.
-- =====================================================================
update public.document_types
  set aktiv = false
  where name = 'Reservierungsformular';
