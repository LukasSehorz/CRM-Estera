-- =====================================================================
-- 0034 — Leaver-Sperre auch in den Finanzierer-RPCs
--
-- Lücke aus 0032: die Storage-Policy verweigert einem gesperrten
-- Finanzierer zwar den DOWNLOAD, aber `finanzierer_kunden()` und
-- `finanzierer_dokumente()` sind SECURITY DEFINER und filtern nur über
-- `finanzierer_id = auth.uid()`. Ein gesperrtes Konto hätte damit weiter
-- Kundennamen und Dateinamen gesehen — beides sind personenbezogene
-- Daten, deren Kenntnis dem Ausgeschiedenen nicht mehr zusteht.
--
-- Beim Finanzierer wiegt das besonders schwer: das ist ein EXTERNER
-- Empfänger (Bank). Endet die Zusammenarbeit, muss der Entzug sofort und
-- vollständig greifen.
-- =====================================================================

begin;

create or replace function public.finanzierer_kunden()
returns table (contact_id uuid, name text)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select distinct c.id, (c.vorname || ' ' || c.nachname)
  from public.document_freigaben f
  join public.contact_documents d on d.id = f.document_id
  join public.contacts c on c.id = d.contact_id
  where f.finanzierer_id = auth.uid()
    and public.is_aktiv()          -- gesperrtes Konto sieht nichts mehr
  order by 2;
$$;

create or replace function public.finanzierer_dokumente(p_contact_id uuid)
returns table (
  id uuid,
  dateiname text,
  anzeigename text,
  kategorie text,
  document_type_id uuid,
  storage_path text,
  groesse bigint,
  created_at timestamptz
)
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select d.id, d.dateiname, d.anzeigename, d.kategorie, d.document_type_id,
         d.storage_path, d.groesse, d.created_at
  from public.document_freigaben f
  join public.contact_documents d on d.id = f.document_id
  where f.finanzierer_id = auth.uid()
    and public.is_aktiv()          -- gesperrtes Konto sieht nichts mehr
    and d.contact_id = p_contact_id
  order by d.created_at desc;
$$;

commit;
