-- Feedback SJ (16.07.2026): Das Kunden-Segment ist BERECHNET (kein Deal =
-- Interessent, offener Deal = In Pipeline, gewonnener Deal = Bestandskunde).
-- Für ALTBESTAND — Kunden, deren Abschlüsse vor der CRM-Einführung liegen —
-- kann beim Anlegen/Bearbeiten "Bestandskunde" markiert werden; der Schalter
-- wirkt als Override in der Segment-Berechnung.
alter table public.contacts
  add column if not exists ist_bestandskunde boolean not null default false;

comment on column public.contacts.ist_bestandskunde is
  'Altbestand-Override: als Bestandskunde behandeln, auch ohne gewonnenen Deal im CRM';
