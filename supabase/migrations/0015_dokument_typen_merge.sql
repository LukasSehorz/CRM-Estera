-- =====================================================================
-- 0015 — Dokumenttypen: Kategorien in die Checkliste mergen (Call SJ)
-- Die freien Dokument-Kategorien werden Teil der EINEN universellen
-- Checkliste; die separate „Dokumente"-Sektion entfällt. Es fehlen als
-- Checklisten-Punkte nur: Reservierungsvereinbarung, Reservierungsformular
-- und ein Sammel-Punkt „Sonstige".
-- =====================================================================
insert into public.document_types (gruppe, name, position) values
  ('allgemein', 'Reservierungsvereinbarung', 20),
  ('allgemein', 'Reservierungsformular', 21),
  ('allgemein', 'Sonstige', 22)
on conflict (name) do nothing;
