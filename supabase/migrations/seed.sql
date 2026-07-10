-- =====================================================================
-- Estera CRM — Seed-Daten
-- Pipeline-Phasen (beide Bereiche) + Berater
-- =====================================================================

-- ---------------------------------------------------------------------
-- PIPELINE-PHASEN — Immobilien (exakt nach Spec 2.1)
-- ---------------------------------------------------------------------
insert into pipeline_stages (bereich, name, position, wahrscheinlichkeit, is_won, is_lost) values
  ('immobilien', 'Neuer Lead',          1, 10,  false, false),
  ('immobilien', 'Kontakt hergestellt', 2, 20,  false, false),
  ('immobilien', 'Termin vereinbart',   3, 30,  false, false),
  ('immobilien', 'Termin durchgeführt', 4, 50,  false, false),
  ('immobilien', 'Objekt reserviert',   5, 70,  false, false),
  ('immobilien', 'Finanzierung fertig', 6, 85,  false, false),
  ('immobilien', 'Notartermin',         7, 95,  false, false),
  ('immobilien', 'Kauf abgeschlossen',  8, 100, true,  false),
  ('immobilien', 'Storniert',           9, 0,   false, true);

-- ---------------------------------------------------------------------
-- PIPELINE-PHASEN — Vermögensverwaltung (exakt nach Spec 2.2)
-- ---------------------------------------------------------------------
insert into pipeline_stages (bereich, name, position, wahrscheinlichkeit, is_won, is_lost) values
  ('vv', 'Interessent',        1, 10,  false, false),
  ('vv', 'Termin vereinbart',  2, 30,  false, false),
  ('vv', 'Follow Up',          3, 50,  false, false),
  ('vv', 'Strategie erstellt', 4, 75,  false, false),
  ('vv', 'Abgeschlossen',      5, 100, true,  false),
  ('vv', 'Nicht abgeschlossen',6, 0,   false, true);

-- ---------------------------------------------------------------------
-- BERATER (Spec Abschnitt 6)
--
-- WICHTIG: profiles.id referenziert auth.users(id). Die Berater-Logins
-- werden in Phase 2 (Auth) angelegt. Dieser Seed kann daher erst sinnvoll
-- laufen, NACHDEM die Auth-User existieren.
--
-- Vorgehen in Phase 2:
--   1. Pro Berater einen Auth-User anlegen (Supabase Auth / Invite).
--   2. Die erhaltene user-UUID hier unten eintragen und dieses
--      INSERT-Statement ausführen.
--
-- Bis dahin ist dieser Block auskommentiert, damit der Seed der
-- Pipeline-Phasen sauber durchläuft.
-- ---------------------------------------------------------------------

-- insert into profiles (id, vorname, nachname, rolle, bereich, aktiv) values
--   ('<UUID_MAX>',    'Max',    'Mustermann', 'geschaeftsfuehrung', '{immobilien,vv}', true),
--   ('<UUID_LISA>',   'Lisa',   'Mustermann', 'berater', '{immobilien}', true),
--   ('<UUID_ANNA>',   'Anna',   'Mustermann', 'berater', '{immobilien}', true),
--   ('<UUID_TOM>',    'Tom',    'Mustermann', 'berater', '{immobilien}', true),
--   ('<UUID_FELIX>',  'Felix',  'Mustermann', 'berater', '{immobilien}', true),
--   ('<UUID_JULIA>',  'Julia',  'Mustermann', 'berater', '{immobilien}', true),
--   ('<UUID_NIKLAS>', 'Niklas', 'Mustermann', 'berater', '{immobilien}', true);
