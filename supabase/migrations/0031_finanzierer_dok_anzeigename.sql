-- =====================================================================
-- 0031 — finanzierer_dokumente liefert zusätzlich den anzeigename (die beim
-- Upload gewählte Dokumentart), damit der Finanzierer die korrekte Bezeichnung
-- sieht (z. B. „Reisepass" statt pauschal „Personalausweis").
-- =====================================================================

drop function if exists public.finanzierer_dokumente(uuid);

create function public.finanzierer_dokumente(p_contact_id uuid)
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
    and d.contact_id = p_contact_id
  order by d.created_at desc;
$$;
grant execute on function public.finanzierer_dokumente(uuid) to authenticated;
