-- =====================================================================
-- Estera CRM — Schema (Migration 0001)
-- Postgres / Supabase
-- Enthält: Enums, Tabellen, Indizes, Historie-Trigger, updated_at-Trigger
-- RLS-Policies kommen separat in 0002_rls.sql (Phase 2)
-- =====================================================================

-- ---------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------
create type rolle_enum as enum ('berater', 'geschaeftsfuehrung');

create type bereich_enum as enum ('immobilien', 'vv');

create type kontakt_status_enum as enum (
  'Neu', 'In Bearbeitung', 'Qualifiziert', 'Nicht erreicht', 'Kalt'
);

create type termin_status_enum as enum (
  'Nicht vereinbart', 'Vereinbart', 'Durchgeführt'
);

create type leadquelle_enum as enum (
  'TikTok', 'Instagram', 'Facebook', 'Empfehlung',
  'Kooperationen', 'Webseite', 'Sonstige'
);

create type finanzierungsrahmen_enum as enum (
  'Bis 250k', '250-350k', '350-500k', '500-700k', '700k+'
);

create type einschaetzung_status_enum as enum (
  'Ausstehend', 'Positiv', 'Bedingt positiv', 'Abgelehnt'
);

create type objekt_status_enum as enum (
  'Verfügbar', 'Reserviert', 'Verkauft'
);

create type berechnungsart_enum as enum (
  'mit Factoring', 'ohne Factoring', 'alter Provsatz'
);

-- ---------------------------------------------------------------------
-- HILFSFUNKTION: updated_at automatisch pflegen
-- ---------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- PROFILES (Berater, verknüpft mit auth.users)
-- ---------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  vorname     text not null,
  nachname    text not null,
  rolle       rolle_enum not null default 'berater',
  bereich     bereich_enum[] not null default '{}',
  aktiv       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger trg_profiles_updated
  before update on profiles
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- PIPELINE_STAGES (Phasen beider Bereiche)
-- ---------------------------------------------------------------------
create table pipeline_stages (
  id                 uuid primary key default gen_random_uuid(),
  bereich            bereich_enum not null,
  name               text not null,
  position           integer not null,
  wahrscheinlichkeit integer not null check (wahrscheinlichkeit between 0 and 100),
  is_won             boolean not null default false,
  is_lost            boolean not null default false,
  created_at         timestamptz not null default now(),
  unique (bereich, position),
  unique (bereich, name)
);

-- ---------------------------------------------------------------------
-- CONTACTS (Kontakte / Leads)
-- ---------------------------------------------------------------------
create table contacts (
  id          uuid primary key default gen_random_uuid(),

  -- Basis
  vorname     text not null,
  nachname    text not null,
  email       text,
  telefon     text,
  berater_id  uuid not null references profiles(id),
  status      kontakt_status_enum not null default 'Neu',
  termin_status termin_status_enum not null default 'Nicht vereinbart',
  leadquelle  leadquelle_enum,
  interesse   bereich_enum[] not null default '{}',

  -- Finanzdaten
  nettoverdienst_monatlich numeric(14,2),
  eigenkapital             numeric(14,2),
  finanzierungsrahmen      finanzierungsrahmen_enum,

  -- Finanzierungseinschätzung
  einschaetzung_erhalten  boolean not null default false,
  datum_einschaetzung     date,
  eingeschaetzter_betrag  numeric(14,2),
  einschaetzung_durch     text,
  einschaetzung_status    einschaetzung_status_enum,

  -- Unterlagen
  unterlagen_vollstaendig boolean not null default false,
  fehlende_unterlagen     text,

  -- Meta
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_contacts_berater on contacts(berater_id);
create index idx_contacts_status on contacts(status);
create index idx_contacts_termin_status on contacts(termin_status);
create index idx_contacts_interesse on contacts using gin(interesse);

create trigger trg_contacts_updated
  before update on contacts
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- DEALS (eine Tabelle, bereich-Diskriminator)
-- ---------------------------------------------------------------------
create table deals (
  id          uuid primary key default gen_random_uuid(),
  dealname    text not null,
  berater_id  uuid not null references profiles(id),
  contact_id  uuid not null references contacts(id) on delete cascade,
  bereich     bereich_enum not null,
  stage_id    uuid not null references pipeline_stages(id),
  naechster_termin date,
  bemerkungen text,

  -- Immobilien-Felder
  kaufpreis      numeric(14,2),
  objekt_adresse text,
  objekt_status  objekt_status_enum,
  notartermin    date,

  -- Vermögensverwaltung-Felder
  bws           numeric(14,2),
  berechnungsart berechnungsart_enum,
  deal_typ      text default 'Nettopolice',
  ratierlich    boolean,
  tippgeber     text,

  -- Meta
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  closed_at   timestamptz
);

create index idx_deals_berater on deals(berater_id);
create index idx_deals_contact on deals(contact_id);
create index idx_deals_stage on deals(stage_id);
create index idx_deals_bereich on deals(bereich);

create trigger trg_deals_updated
  before update on deals
  for each row execute function set_updated_at();

-- ---------------------------------------------------------------------
-- DEAL_STAGE_HISTORY (Herzstück für alle Auswertungen)
-- ---------------------------------------------------------------------
create table deal_stage_history (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid not null references deals(id) on delete cascade,
  stage_id    uuid not null references pipeline_stages(id),
  entered_at  timestamptz not null default now(),
  left_at     timestamptz,
  changed_by  uuid references profiles(id)
);

create index idx_history_deal on deal_stage_history(deal_id);
create index idx_history_stage on deal_stage_history(stage_id);

-- ---------------------------------------------------------------------
-- HISTORIE-AUTOMATIK
-- Bei INSERT eines Deals: ersten Historie-Eintrag anlegen.
-- Bei UPDATE der stage_id: alten Eintrag schließen (left_at),
--   neuen Eintrag öffnen. Bei Eintritt in eine is_won-Phase:
--   closed_at am Deal setzen.
-- ---------------------------------------------------------------------
create or replace function track_deal_stage()
returns trigger as $$
declare
  v_is_won boolean;
begin
  if (tg_op = 'INSERT') then
    insert into deal_stage_history (deal_id, stage_id, entered_at, changed_by)
    values (new.id, new.stage_id, now(), auth.uid());
    return new;
  end if;

  if (tg_op = 'UPDATE' and new.stage_id is distinct from old.stage_id) then
    -- alten offenen Eintrag schließen
    update deal_stage_history
      set left_at = now()
      where deal_id = new.id and left_at is null;

    -- neuen Eintrag öffnen
    insert into deal_stage_history (deal_id, stage_id, entered_at, changed_by)
    values (new.id, new.stage_id, now(), auth.uid());

    -- closed_at setzen, wenn neue Phase eine Gewinn-Phase ist
    select is_won into v_is_won from pipeline_stages where id = new.stage_id;
    if (v_is_won) then
      new.closed_at = now();
    else
      new.closed_at = null;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

-- Trigger für INSERT (AFTER, da Historie auf die Deal-ID verweist)
create trigger trg_deal_stage_insert
  after insert on deals
  for each row execute function track_deal_stage();

-- Trigger für UPDATE der Phase (BEFORE, damit closed_at mitgesetzt wird)
create trigger trg_deal_stage_update
  before update on deals
  for each row execute function track_deal_stage();
