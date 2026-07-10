-- =====================================================================
-- 0008 — SLA je Phase (Schleife 2, Kap. 4.4)
-- Maximale Verweildauer eines Deals in einer Phase (Tage). Grundlage für
-- Deal-Age-Sortierung und die Health-Ampel (4.5). Werte sind bewusst
-- DB-Daten (kein Code): OFFEN #7 — Sebastian bestätigt/ändert nur Zahlen.
-- =====================================================================

alter table public.pipeline_stages
  add column if not exists sla_tage numeric(5,1);

comment on column public.pipeline_stages.sla_tage is
  'Max. Tage in dieser Phase (4.4). NULL = keine Frist (z. B. Abschlussphasen).';

-- Immobilien (Vorgaben Sebastian; "so schnell wie möglich" = enger Default 3)
update public.pipeline_stages set sla_tage = 7  where bereich='immobilien' and name='Neuer Lead';
update public.pipeline_stages set sla_tage = 2  where bereich='immobilien' and name='T1 Konzept';
update public.pipeline_stages set sla_tage = 3  where bereich='immobilien' and name='T2 Objektvorstellung';
update public.pipeline_stages set sla_tage = 5  where bereich='immobilien' and name='Objekt reserviert';
update public.pipeline_stages set sla_tage = 14 where bereich='immobilien' and name='Finanzierung in Prüfung';
update public.pipeline_stages set sla_tage = 21 where bereich='immobilien' and name='Notartermin';

-- VV: keine Kundenvorgabe (OFFEN #7) — moderate Defaults, jederzeit änderbar.
update public.pipeline_stages set sla_tage = 7  where bereich='vv' and name='Interessent';
update public.pipeline_stages set sla_tage = 7  where bereich='vv' and name='Termin vereinbart';
update public.pipeline_stages set sla_tage = 7  where bereich='vv' and name='Follow Up';
update public.pipeline_stages set sla_tage = 14 where bereich='vv' and name='Strategie erstellt';

-- Abschluss-/Verlustphasen bleiben ohne Frist (NULL).
