-- =====================================================================
-- Estera CRM — Fachkonzept-Erweiterung (Migration 0003)
-- Stand 26.06.2026. Setzt um:
--   1.1  Finanzierungsrahmen als freier €-Betrag (+ Presets im UI)
--   1.3  Neue Immobilien-Pipeline (T1/T2 statt generischer Termine)
--   2.x  VV-Provisionslogik: Sparbeitrag/Jahre -> BWS, Factoring-Checkbox,
--        Einbehalt (85/15), Tippgeber-Satz, Vertriebler-Stufe (nur Admin/GF)
-- Ändert 0001/0002 NICHT. Rework + additive Migration, idempotent gehalten.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1.1  contacts: Finanzierungsrahmen als Betrag (führend). Die alte
--      Enum-Spalte bleibt als Alt-Feld erhalten (kein Datenverlust),
--      wird im UI aber nicht mehr verwendet.
-- ---------------------------------------------------------------------
alter table contacts
  add column if not exists finanzierungsrahmen_betrag numeric(14,2);

-- ---------------------------------------------------------------------
-- 2.x  deals: VV-Eingabefelder gemäß Fachkonzept
-- ---------------------------------------------------------------------
alter table deals
  add column if not exists sparbeitrag    numeric(14,2),
  add column if not exists anzahl_jahre   integer,
  add column if not exists factoring      boolean not null default false,
  add column if not exists tippgeber_satz numeric(5,2);   -- Prozent, z. B. 10.00

-- "Berechnungsart" wird durch Factoring-Checkbox + Einbehalt-Logik ersetzt.
alter table deals drop column if exists berechnungsart;

-- ---------------------------------------------------------------------
-- profiles: Vertriebler-Stufe (persönlicher Provisionsanteil in %).
-- Wird AUSSCHLIESSLICH vom Admin (GF) gesetzt (Funktion unten).
-- ---------------------------------------------------------------------
alter table profiles
  add column if not exists vertriebler_stufe numeric(5,2);  -- Prozent, z. B. 30.00 / 70.00

-- Sinnvolle Startwerte für bestehende Profile (Admin kann anpassen).
update profiles set vertriebler_stufe = 70.00
  where rolle = 'geschaeftsfuehrung' and vertriebler_stufe is null;
update profiles set vertriebler_stufe = 30.00
  where rolle = 'berater' and vertriebler_stufe is null;

-- ---------------------------------------------------------------------
-- 1.3  Immobilien-Pipeline auf neue Phasen umstellen. Bestehende Deals
--      + Historie werden auf die passende neue Phase umgehängt, danach
--      werden die Alt-Phasen entfernt. Positionen temporär verschieben,
--      um unique(bereich,position) während des Umbaus zu wahren.
-- ---------------------------------------------------------------------
update pipeline_stages set position = position + 100 where bereich = 'immobilien';

-- Vorhandene Phasen behalten (Name), Position/Wahrscheinlichkeit neu setzen:
update pipeline_stages set position = 1, wahrscheinlichkeit = 10  where bereich='immobilien' and name='Neuer Lead';
update pipeline_stages set position = 4, wahrscheinlichkeit = 60  where bereich='immobilien' and name='Objekt reserviert';
update pipeline_stages set position = 6, wahrscheinlichkeit = 95  where bereich='immobilien' and name='Notartermin';
update pipeline_stages set position = 7, wahrscheinlichkeit = 100 where bereich='immobilien' and name='Kauf abgeschlossen';
update pipeline_stages set position = 8, wahrscheinlichkeit = 0   where bereich='immobilien' and name='Storniert';

-- Neue Phasen einfügen (falls noch nicht vorhanden):
insert into pipeline_stages (bereich, name, position, wahrscheinlichkeit, is_won, is_lost)
select 'immobilien','T1 Konzept',2,25,false,false
where not exists (select 1 from pipeline_stages where bereich='immobilien' and name='T1 Konzept');

insert into pipeline_stages (bereich, name, position, wahrscheinlichkeit, is_won, is_lost)
select 'immobilien','T2 Objektvorstellung',3,40,false,false
where not exists (select 1 from pipeline_stages where bereich='immobilien' and name='T2 Objektvorstellung');

insert into pipeline_stages (bereich, name, position, wahrscheinlichkeit, is_won, is_lost)
select 'immobilien','Finanzierung in Prüfung',5,80,false,false
where not exists (select 1 from pipeline_stages where bereich='immobilien' and name='Finanzierung in Prüfung');

-- Bestehende Deals + Historie von Alt-Phasen auf neue Phasen umhängen.
do $$
declare
  m record;
  v_old uuid;
  v_new uuid;
begin
  for m in
    select * from (values
      ('Kontakt hergestellt',  'T1 Konzept'),
      ('Termin vereinbart',    'T2 Objektvorstellung'),
      ('Termin durchgeführt',  'T2 Objektvorstellung'),
      ('Finanzierung fertig',  'Finanzierung in Prüfung')
    ) as t(oldname, newname)
  loop
    select id into v_old from pipeline_stages where bereich='immobilien' and name=m.oldname;
    select id into v_new from pipeline_stages where bereich='immobilien' and name=m.newname;
    if v_old is not null and v_new is not null then
      update deals              set stage_id = v_new where stage_id = v_old;
      update deal_stage_history set stage_id = v_new where stage_id = v_old;
    end if;
  end loop;
end $$;

-- Alt-Phasen entfernen (jetzt referenzfrei).
delete from pipeline_stages
  where bereich='immobilien'
    and name in ('Kontakt hergestellt','Termin vereinbart','Termin durchgeführt','Finanzierung fertig');

-- ---------------------------------------------------------------------
-- Rechtekonzept: Vertriebler-Stufe darf NUR der Admin (GF) setzen.
-- profiles hat bewusst keine UPDATE-Policy -> Berater können ihr Profil
-- (und damit ihre Stufe) nicht selbst ändern. Für die GF eine eng
-- begrenzte SECURITY-DEFINER-Funktion, die AUSSCHLIESSLICH die Stufe
-- schreibt und selbst prüft, dass der Aufrufer GF ist.
-- ---------------------------------------------------------------------
create or replace function public.set_vertriebler_stufe(target uuid, stufe numeric)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_gf() then
    raise exception 'Nur die Geschäftsführung darf die Vertriebler-Stufe setzen.';
  end if;
  if stufe is null or stufe < 0 or stufe > 100 then
    raise exception 'Stufe muss zwischen 0 und 100 liegen.';
  end if;
  update public.profiles set vertriebler_stufe = stufe where id = target;
end $$;

grant execute on function public.set_vertriebler_stufe(uuid, numeric) to authenticated;

commit;
