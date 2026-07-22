-- =====================================================================
-- 0028 — Finanzierer: is_finanzierer()-Helper + Dokument-Freigaben.
-- Der Finanzierer sieht NUR die ihm von der GF freigeschalteten Dokumente
-- (und den Kundennamen). Zugriff ausschließlich über SECURITY-DEFINER-RPCs,
-- damit garantiert keine anderen Spalten/Zeilen sichtbar werden.
-- =====================================================================

create or replace function public.is_finanzierer()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid() and rolle = 'finanzierer'
  );
$$;
grant execute on function public.is_finanzierer() to authenticated;

-- Freigabe pro einzelnem Dokument (Entscheidung 5: einzeln ODER alle auf einmal;
-- „alle" legt einfach je Dokument eine Zeile an).
create table if not exists public.document_freigaben (
  id              uuid primary key default gen_random_uuid(),
  document_id     uuid not null references public.contact_documents(id) on delete cascade,
  finanzierer_id  uuid not null references public.profiles(id) on delete cascade,
  freigegeben_von uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (document_id, finanzierer_id)
);
create index if not exists idx_freigaben_finanzierer on public.document_freigaben (finanzierer_id);
create index if not exists idx_freigaben_document on public.document_freigaben (document_id);

alter table public.document_freigaben enable row level security;
grant select, insert, delete on public.document_freigaben to authenticated;

-- Lesen: GF (verwaltet) + der betroffene Finanzierer (sieht seine Freigaben).
drop policy if exists freigaben_select on public.document_freigaben;
create policy freigaben_select on public.document_freigaben
  for select using (public.is_gf() or finanzierer_id = auth.uid());

-- Freischalten/Entziehen: nur GF.
drop policy if exists freigaben_insert on public.document_freigaben;
create policy freigaben_insert on public.document_freigaben
  for insert with check (public.is_gf() and freigegeben_von = auth.uid());

drop policy if exists freigaben_delete on public.document_freigaben;
create policy freigaben_delete on public.document_freigaben
  for delete using (public.is_gf());

-- ---------------------------------------------------------------------
-- Streng abgeschottete Lese-RPCs für den Finanzierer. Der auth.uid()-Filter
-- begrenzt die Rückgabe selbst — es gibt keinen direkten Tabellenzugriff.
-- ---------------------------------------------------------------------

-- Kundenliste (NUR id + Name) der Kunden mit ≥ 1 Freigabe für den Aufrufer.
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
  order by 2;
$$;
grant execute on function public.finanzierer_kunden() to authenticated;

-- Die freigegebenen Dokumente eines Kunden (nur für den Aufrufer freigegebene).
create or replace function public.finanzierer_dokumente(p_contact_id uuid)
returns table (
  id uuid,
  dateiname text,
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
  select d.id, d.dateiname, d.kategorie, d.document_type_id,
         d.storage_path, d.groesse, d.created_at
  from public.document_freigaben f
  join public.contact_documents d on d.id = f.document_id
  where f.finanzierer_id = auth.uid()
    and d.contact_id = p_contact_id
  order by d.created_at desc;
$$;
grant execute on function public.finanzierer_dokumente(uuid) to authenticated;

-- Storage: Der Finanzierer darf genau die freigegebenen Dateien herunterladen.
drop policy if exists finanzierer_download on storage.objects;
create policy finanzierer_download on storage.objects
  for select using (
    bucket_id = 'kundendokumente'
    and exists (
      select 1
      from public.document_freigaben f
      join public.contact_documents d on d.id = f.document_id
      where f.finanzierer_id = auth.uid()
        and d.storage_path = storage.objects.name
    )
  );
