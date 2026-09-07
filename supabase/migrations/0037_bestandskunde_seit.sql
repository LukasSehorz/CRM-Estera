-- Feedback Mandant (07.09.2026): Bestandskunden brauchen ein Datum, sonst
-- ist die Kundenliste unsortierbar ("alles durcheinander"). Für Altbestand
-- wird das Abschlussdatum manuell erfasst; bei Kunden mit gewonnenem Deal
-- im CRM leitet sich das Datum aus deals.closed_at ab (kein Feld nötig).
alter table public.contacts
  add column if not exists bestandskunde_seit date;

comment on column public.contacts.bestandskunde_seit is
  'Altbestand: Datum des Abschlusses vor der CRM-Einfuehrung (Kunde seit).';

-- Sortier-/Filterlast der Kundenliste geht ueber dieses Datum.
create index if not exists idx_contacts_bestandskunde_seit
  on public.contacts (bestandskunde_seit);
