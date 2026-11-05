-- =====================================================================
-- 0040 — Meta-Lead-Anbindung (Instant Forms, Wunsch Lukas 05.11.2026).
-- Leads aus Meta-Werbeanzeigen (Facebook/Instagram Sofortformulare)
-- landen automatisch als Kontakt im CRM. Herkunft (Kampagne, Anzeige,
-- Formular) bleibt am Kontakt sichtbar, damit erkennbar ist, welche
-- Anzeige gute Leads bringt.
--
-- meta_lead_id ist eindeutig: Webhook und regelmäßiger Abgleich können
-- denselben Lead melden, angelegt wird er trotzdem nur einmal.
-- (UNIQUE erlaubt mehrere NULL — alle bisherigen Kontakte bleiben gültig.)
-- =====================================================================

alter table public.contacts
  add column if not exists meta_lead_id  text,
  add column if not exists meta_kampagne text,
  add column if not exists meta_anzeige  text,
  add column if not exists meta_formular text;

do $$ begin
  alter table public.contacts
    add constraint contacts_meta_lead_id_key unique (meta_lead_id);
exception when duplicate_object or duplicate_table then null; end $$;

comment on column public.contacts.meta_lead_id is
  'ID des Leads bei Meta (Sofortformular). Gesetzt nur bei automatisch importierten Leads.';
comment on column public.contacts.meta_kampagne is 'Meta: Name der Kampagne, aus der der Lead kam.';
comment on column public.contacts.meta_anzeige  is 'Meta: Name der Anzeige, aus der der Lead kam.';
comment on column public.contacts.meta_formular is 'Meta: Name des Sofortformulars.';
