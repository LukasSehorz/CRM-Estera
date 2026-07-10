-- =====================================================================
-- 0007 — Kundenakte (Schleife 2, Kap. 3)
-- Finanzierungsstatus + Kundentyp am Kontakt, Dokumenten-Checkliste
-- (fest, 3 Gruppen nach Kundentyp), Activity-Timeline (auto + manuell)
-- und Aufgaben. RLS überall: Berater nur eigene, GF alles.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Kontakt-Erweiterungen
-- ---------------------------------------------------------------------
do $$ begin
  create type finanzierungsstatus_enum as enum ('offen', 'in_pruefung', 'zugesagt');
exception when duplicate_object then null; end $$;

alter table public.contacts
  add column if not exists finanzierungsstatus finanzierungsstatus_enum not null default 'offen',
  add column if not exists ist_selbststaendig boolean not null default false,
  add column if not exists ist_immobilienbesitzer boolean not null default false;

comment on column public.contacts.finanzierungsstatus is
  'Kleines Statusfeld der Akte (3.4): offen / in Prüfung / zugesagt.';
comment on column public.contacts.ist_selbststaendig is
  'Kundentyp (3.2): blendet die Dokumentgruppe für Selbstständige ein.';
comment on column public.contacts.ist_immobilienbesitzer is
  'Kundentyp (3.2): blendet die Dokumentgruppe für Immobilienbesitzer ein.';

-- ---------------------------------------------------------------------
-- 2) Dokumenten-Katalog (feste Checkliste 3.2) + Status je Kontakt
-- ---------------------------------------------------------------------
do $$ begin
  create type dokument_gruppe_enum as enum ('allgemein', 'selbststaendig', 'immobilienbesitzer');
exception when duplicate_object then null; end $$;

create table if not exists public.document_types (
  id        uuid primary key default gen_random_uuid(),
  gruppe    dokument_gruppe_enum not null,
  name      text not null unique,
  position  integer not null,
  aktiv     boolean not null default true
);

insert into public.document_types (gruppe, name, position) values
  ('allgemein', 'Selbstauskunft (ausgefüllt und unterschrieben)', 1),
  ('allgemein', 'Personalausweis / Reisepass + Aufenthaltstitel (Vorder- und Rückseite)', 2),
  ('allgemein', 'Die letzten drei Gehaltsnachweise (alle Seiten)', 3),
  ('allgemein', 'Lohnsteuerbescheinigung des Vorjahres oder Dezemberabrechnung', 4),
  ('allgemein', 'Aktuelle Renteninformation (ab dem 30. Lebensjahr)', 5),
  ('allgemein', 'Eigenkapitalnachweis (Name + Datum + Betrag auf einem Dokument)', 6),
  ('allgemein', 'Eigener Mietvertrag oder „Mietfrei-Bestätigung"', 7),
  ('allgemein', 'Nachweis für alle Verbindlichkeiten (Darlehen, Kredite, Leasing)', 8),
  ('allgemein', 'Kontoauszüge der letzten drei Monate (Gehalts-/Hauptkonto)', 9),
  ('allgemein', 'Letzter Einkommensteuerbescheid oder Bestätigung „keine Steuererklärung"', 10),
  ('selbststaendig', 'BWA Dezember des Vorjahres inkl. Summen- und Saldenliste', 11),
  ('selbststaendig', 'Jahresabschlüsse der letzten drei Jahre (sofern vorliegend)', 12),
  ('selbststaendig', 'Steuerbescheide + Steuererklärungen', 13),
  ('immobilienbesitzer', 'Notariell beurkundeter Kaufvertrag', 14),
  ('immobilienbesitzer', 'Darlehensvertrag und letzter Jahreskontoauszug', 15),
  ('immobilienbesitzer', 'Falls vermietet: vollständige Mietverträge', 16)
on conflict (name) do nothing;

create table if not exists public.contact_document_status (
  contact_id       uuid not null references public.contacts(id) on delete cascade,
  document_type_id uuid not null references public.document_types(id),
  vorhanden        boolean not null default false,
  document_id      uuid references public.contact_documents(id) on delete set null,
  updated_at       timestamptz not null default now(),
  primary key (contact_id, document_type_id)
);

create index if not exists idx_cds_contact on public.contact_document_status(contact_id);

-- ---------------------------------------------------------------------
-- 3) Activity-Timeline (3.5) — manuelle + automatische Einträge
-- ---------------------------------------------------------------------
do $$ begin
  create type activity_typ_enum as enum ('anruf', 'mail', 'whatsapp', 'notiz', 'system');
exception when duplicate_object then null; end $$;

create table if not exists public.contact_activities (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references public.contacts(id) on delete cascade,
  typ         activity_typ_enum not null default 'notiz',
  text        text not null,
  created_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

create index if not exists idx_activities_contact
  on public.contact_activities(contact_id, created_at desc);

-- ---------------------------------------------------------------------
-- 4) Aufgaben (4.3 — Datenmodell jetzt, Cockpit-UI in Phase 12)
-- ---------------------------------------------------------------------
create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  titel       text not null,
  faellig_am  date,
  erledigt    boolean not null default false,
  contact_id  uuid references public.contacts(id) on delete cascade,
  deal_id     uuid references public.deals(id) on delete cascade,
  owner_id    uuid not null references public.profiles(id),
  created_at  timestamptz not null default now()
);

create index if not exists idx_tasks_owner on public.tasks(owner_id, erledigt, faellig_am);
create index if not exists idx_tasks_contact on public.tasks(contact_id);

-- ---------------------------------------------------------------------
-- 5) Grants + RLS
-- ---------------------------------------------------------------------
grant select on public.document_types to authenticated;
grant select, insert, update, delete on public.contact_document_status to authenticated;
grant select, insert on public.contact_activities to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;

alter table public.document_types          enable row level security;
alter table public.contact_document_status enable row level security;
alter table public.contact_activities      enable row level security;
alter table public.tasks                   enable row level security;

drop policy if exists "document_types_select" on public.document_types;
create policy "document_types_select"
  on public.document_types for select to authenticated using (true);

-- Checklisten-Status: sichtbar/änderbar, wenn der Kontakt sichtbar ist.
drop policy if exists "cds_all" on public.contact_document_status;
create policy "cds_all"
  on public.contact_document_status for all to authenticated
  using (exists (
    select 1 from public.contacts c
    where c.id = contact_document_status.contact_id
      and (public.is_gf() or c.berater_id = auth.uid())
  ))
  with check (exists (
    select 1 from public.contacts c
    where c.id = contact_document_status.contact_id
      and (public.is_gf() or c.berater_id = auth.uid())
  ));

drop policy if exists "activities_select" on public.contact_activities;
create policy "activities_select"
  on public.contact_activities for select to authenticated
  using (exists (
    select 1 from public.contacts c
    where c.id = contact_activities.contact_id
      and (public.is_gf() or c.berater_id = auth.uid())
  ));

drop policy if exists "activities_insert" on public.contact_activities;
create policy "activities_insert"
  on public.contact_activities for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.contacts c
      where c.id = contact_activities.contact_id
        and (public.is_gf() or c.berater_id = auth.uid())
    )
  );

drop policy if exists "tasks_all" on public.tasks;
create policy "tasks_all"
  on public.tasks for all to authenticated
  using (public.is_gf() or owner_id = auth.uid())
  with check (public.is_gf() or owner_id = auth.uid());

-- ---------------------------------------------------------------------
-- 6) Automatische Timeline-Einträge (3.5) — DB-seitig, damit sie
--    unabhängig vom Auslöser (UI, Drag&Drop, API) immer geschrieben werden.
--    SECURITY DEFINER: schreibt an den RLS-Policies vorbei.
-- ---------------------------------------------------------------------
create or replace function public.log_deal_stage_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  stage_name text;
begin
  if tg_op = 'INSERT' then
    insert into public.contact_activities (contact_id, typ, text, created_by)
    values (new.contact_id, 'system',
            'Deal „' || new.dealname || '" angelegt', auth.uid());
    return new;
  end if;
  if new.stage_id is distinct from old.stage_id then
    select name into stage_name from public.pipeline_stages where id = new.stage_id;
    insert into public.contact_activities (contact_id, typ, text, created_by)
    values (new.contact_id, 'system',
            'Deal „' || new.dealname || '": Phase → „' || coalesce(stage_name, '?') || '"',
            auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_deals_activity on public.deals;
create trigger trg_deals_activity
  after insert or update on public.deals
  for each row execute function public.log_deal_stage_activity();

create or replace function public.log_contact_status_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.status is distinct from old.status then
    insert into public.contact_activities (contact_id, typ, text, created_by)
    values (new.id, 'system', 'Kontakt-Status → „' || new.status || '"', auth.uid());
  end if;
  if new.termin_status is distinct from old.termin_status then
    insert into public.contact_activities (contact_id, typ, text, created_by)
    values (new.id, 'system', 'Termin-Status → „' || new.termin_status || '"', auth.uid());
  end if;
  if new.finanzierungsstatus is distinct from old.finanzierungsstatus then
    insert into public.contact_activities (contact_id, typ, text, created_by)
    values (new.id, 'system',
            'Finanzierungsstatus → „' ||
            case new.finanzierungsstatus
              when 'offen' then 'Offen'
              when 'in_pruefung' then 'In Prüfung'
              else 'Zugesagt' end || '"',
            auth.uid());
  end if;
  return new;
end;
$$;

drop trigger if exists trg_contacts_activity on public.contacts;
create trigger trg_contacts_activity
  after update on public.contacts
  for each row execute function public.log_contact_status_activity();

create or replace function public.log_document_upload_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.contact_activities (contact_id, typ, text, created_by)
  values (new.contact_id, 'system',
          'Dokument „' || new.dateiname || '" hochgeladen', auth.uid());
  return new;
end;
$$;

drop trigger if exists trg_documents_activity on public.contact_documents;
create trigger trg_documents_activity
  after insert on public.contact_documents
  for each row execute function public.log_document_upload_activity();
