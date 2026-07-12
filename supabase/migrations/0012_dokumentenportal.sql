-- =====================================================================
-- 0012 — Dokumentenportal (V4.1 Kap. 14)
--   14.2  Mehrere Dateien je Dokumenttyp (Gehaltsnachweis 1/3, 2/3, 3/3):
--         contact_documents bekommt eine optionale Verknüpfung zum
--         Checklisten-Typ. „vorhanden" leitet sich künftig aus „≥ 1 Datei
--         ODER manuell abgehakt" ab.
--   14.1  Vorlagen-Bibliothek (für alle Vertriebspartner) + interne
--         Dokumente (nur GF) — eigener Bucket, RLS.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 14.2  Mehrfach-Dateien je Typ
-- ---------------------------------------------------------------------
alter table public.contact_documents
  add column if not exists document_type_id uuid
    references public.document_types(id) on delete set null;

create index if not exists idx_contact_documents_type
  on public.contact_documents(document_type_id);

-- ---------------------------------------------------------------------
-- 14.1  Vorlagen / interne Dokumente — Bucket + Metadaten
--   sichtbarkeit:
--     'vorlage' → alle angemeldeten Nutzer lesen (für alle Vertriebspartner)
--     'intern'  → nur GF (14.3: Verträge, Preislisten, Vergütungspläne …)
--   bereich: immobilien | vv | null (allgemein) — für die Trennung im UI
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('vorlagen', 'vorlagen', false)
on conflict (id) do nothing;

create table if not exists public.portal_documents (
  id            uuid primary key default gen_random_uuid(),
  titel         text not null,
  dateiname     text not null,
  storage_path  text not null unique,
  sichtbarkeit  text not null default 'vorlage'
                  check (sichtbarkeit in ('vorlage', 'intern')),
  bereich       bereich_enum,          -- null = allgemein
  groesse       bigint,
  uploaded_by   uuid references public.profiles(id),
  created_at    timestamptz not null default now()
);
create index if not exists idx_portal_documents_sicht
  on public.portal_documents(sichtbarkeit);

grant select, insert, delete on public.portal_documents to authenticated;
grant all on public.portal_documents to service_role;

alter table public.portal_documents enable row level security;

-- Lesen: Vorlagen alle, interne nur GF.
drop policy if exists "portal_documents_select" on public.portal_documents;
create policy "portal_documents_select" on public.portal_documents
  for select to authenticated
  using (sichtbarkeit = 'vorlage' or public.is_gf());

-- Schreiben/Löschen: nur GF (14.3 — Vorlagen & interne Dateien pflegt die GF).
drop policy if exists "portal_documents_insert" on public.portal_documents;
create policy "portal_documents_insert" on public.portal_documents
  for insert to authenticated with check (public.is_gf());
drop policy if exists "portal_documents_delete" on public.portal_documents;
create policy "portal_documents_delete" on public.portal_documents
  for delete to authenticated using (public.is_gf());

-- Storage-Policies für den Vorlagen-Bucket.
-- Pfad-Konvention: <sichtbarkeit>/<datei> — erste Ebene = 'vorlage'|'intern'.
drop policy if exists "vorlagen_select" on storage.objects;
create policy "vorlagen_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vorlagen'
    and ((storage.foldername(name))[1] = 'vorlage' or public.is_gf())
  );

drop policy if exists "vorlagen_insert" on storage.objects;
create policy "vorlagen_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'vorlagen' and public.is_gf());

drop policy if exists "vorlagen_delete" on storage.objects;
create policy "vorlagen_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'vorlagen' and public.is_gf());
