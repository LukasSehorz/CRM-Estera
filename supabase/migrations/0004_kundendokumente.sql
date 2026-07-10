-- =====================================================================
-- Estera CRM — Kundendokumente (Migration 0004, Fachkonzept 1.2)
-- Privater Storage-Bucket + Metadaten-Tabelle. Zugriff (DSGVO): nur der
-- zuständige Berater des Kontakts + Geschäftsführung. Durchgesetzt über RLS
-- auf public.contact_documents UND storage.objects.
-- Pfad-Konvention: <contact_id>/<datei>  -> erste Ordnerebene = contact_id.
-- =====================================================================

begin;

-- Privater Bucket (nicht öffentlich lesbar).
insert into storage.buckets (id, name, public)
values ('kundendokumente', 'kundendokumente', false)
on conflict (id) do nothing;

-- Metadaten je hochgeladenem Dokument.
create table if not exists public.contact_documents (
  id           uuid primary key default gen_random_uuid(),
  contact_id   uuid not null references public.contacts(id) on delete cascade,
  dateiname    text not null,
  storage_path text not null unique,
  kategorie    text not null default 'Sonstige',
  groesse      bigint,
  uploaded_by  uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);
create index if not exists idx_contact_documents_contact
  on public.contact_documents(contact_id);

grant select, insert, delete on public.contact_documents to authenticated;

alter table public.contact_documents enable row level security;

-- Zugriff auf Metadaten, wenn der zugehörige Kontakt sichtbar ist.
drop policy if exists "contact_documents_select" on public.contact_documents;
create policy "contact_documents_select" on public.contact_documents
  for select to authenticated
  using (
    exists (
      select 1 from public.contacts c
      where c.id = contact_id and (public.is_gf() or c.berater_id = auth.uid())
    )
  );

drop policy if exists "contact_documents_insert" on public.contact_documents;
create policy "contact_documents_insert" on public.contact_documents
  for insert to authenticated
  with check (
    exists (
      select 1 from public.contacts c
      where c.id = contact_id and (public.is_gf() or c.berater_id = auth.uid())
    )
  );

drop policy if exists "contact_documents_delete" on public.contact_documents;
create policy "contact_documents_delete" on public.contact_documents
  for delete to authenticated
  using (
    exists (
      select 1 from public.contacts c
      where c.id = contact_id and (public.is_gf() or c.berater_id = auth.uid())
    )
  );

-- Storage-Policies: dieselbe Sichtbarkeitsregel auf die Dateien im Bucket.
drop policy if exists "kundendokumente_select" on storage.objects;
create policy "kundendokumente_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'kundendokumente'
    and exists (
      select 1 from public.contacts c
      where c.id = ((storage.foldername(name))[1])::uuid
        and (public.is_gf() or c.berater_id = auth.uid())
    )
  );

drop policy if exists "kundendokumente_insert" on storage.objects;
create policy "kundendokumente_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'kundendokumente'
    and exists (
      select 1 from public.contacts c
      where c.id = ((storage.foldername(name))[1])::uuid
        and (public.is_gf() or c.berater_id = auth.uid())
    )
  );

drop policy if exists "kundendokumente_delete" on storage.objects;
create policy "kundendokumente_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'kundendokumente'
    and exists (
      select 1 from public.contacts c
      where c.id = ((storage.foldername(name))[1])::uuid
        and (public.is_gf() or c.berater_id = auth.uid())
    )
  );

commit;
