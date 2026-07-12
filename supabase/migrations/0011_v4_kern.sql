-- =====================================================================
-- 0011 — V4.1-Kern (Anforderungsdokument 11.07.2026)
--   1.1  Umsatz-Buchung: Immobilien zum Notartermin (App-seitig über
--        deal_stage_history — hier nur Datenmodell-Ergänzungen)
--   1.5  Immo-Anteil-Default pro Berater (vorbefüllt, pro Deal überschreibbar)
--   2.5  Backoffice-Rolle (Wert aus 0010): Dokumente/Aufgaben/Kontakte
--        verwalten, Deals lesen — KEINE Provisionsrechte
--   3.4  „Nächster Schritt" (Text + Fälligkeit) je Deal
--   7.1  VV-Zahlart: factoring / ohne_factoring / ratierlich —
--        Einbehalt (85/15) gibt es NUR MIT Factoring (GEKLÄRT-Box)
--   7.3  Karriere-Fenster-Start je Berater (reine Anzeige-Logik)
--   8    Partner-Ebene: parent_berater_id (eine Ebene) + Downline-Lesezugriff
--   15.2 Finanzierungseinschätzung neu (3 Stati + „auf Objekt belegt"),
--        Monatsziel selbst setzen (GF kann sperren)
-- =====================================================================

-- ---------------------------------------------------------------------
-- deals: VV-Zahlart + Nächster Schritt + Jahre-Grenze (7.5: max. 40)
-- ---------------------------------------------------------------------
alter table deals
  add column if not exists vv_zahlart text
    check (vv_zahlart in ('factoring', 'ohne_factoring', 'ratierlich')),
  add column if not exists next_step text,
  add column if not exists next_step_faellig date;

-- Bestehende VV-Deals auf die neue Zahlart heben (alte Flags bleiben
-- als Alt-Felder erhalten und werden per Trigger synchron gehalten).
update deals set vv_zahlart = case
    when ratierlich is true then 'ratierlich'
    when factoring  is true then 'factoring'
    else 'ohne_factoring'
  end
  where bereich = 'vv' and vv_zahlart is null;

-- Jahre ≤ 40 (7.5) — NOT VALID, damit Altdaten die Migration nicht kippen.
do $$ begin
  alter table deals add constraint chk_deals_jahre_max40
    check (anzahl_jahre is null or (anzahl_jahre between 1 and 40)) not valid;
exception when duplicate_object then null; end $$;

-- Zahlart und Alt-Flags immer synchron (egal, wer schreibt).
create or replace function sync_vv_zahlart()
returns trigger as $$
begin
  if new.bereich = 'vv' then
    if new.vv_zahlart is null then
      new.vv_zahlart := case
        when new.ratierlich is true then 'ratierlich'
        when new.factoring  is true then 'factoring'
        else 'ohne_factoring' end;
    end if;
    new.factoring  := (new.vv_zahlart = 'factoring');
    new.ratierlich := (new.vv_zahlart = 'ratierlich');
  end if;
  return new;
end $$ language plpgsql;

drop trigger if exists trg_deals_sync_zahlart on deals;
create trigger trg_deals_sync_zahlart
  before insert or update on deals
  for each row execute function sync_vv_zahlart();

-- ---------------------------------------------------------------------
-- contacts: Einschätzung neu (15.2) — 3 Stati, Betrag „finanzierbar bis"
-- bleibt in eingeschaetzter_betrag, optional „auf Objekt belegt".
-- Alt-Spalten bleiben erhalten (kein Datenverlust), UI nutzt nur die neuen.
-- ---------------------------------------------------------------------
alter table contacts
  add column if not exists einschaetzung text not null default 'ausstehend'
    check (einschaetzung in ('ausstehend', 'eingeschaetzt', 'nicht_finanzierbar')),
  add column if not exists belegt_deal_id uuid references deals(id) on delete set null;

update contacts set einschaetzung = case
    when einschaetzung_status in ('Positiv', 'Bedingt positiv') then 'eingeschaetzt'
    when einschaetzung_status = 'Abgelehnt' then 'nicht_finanzierbar'
    else 'ausstehend'
  end
  where einschaetzung = 'ausstehend' and einschaetzung_status is not null;

-- ---------------------------------------------------------------------
-- profiles: Anbindung (Immo-Default 1.5, Partner-Ebene Kap. 8) +
-- Karriere-Fenster (7.3)
-- ---------------------------------------------------------------------
alter table profiles
  add column if not exists immo_anteil_default numeric(5,2)
    check (immo_anteil_default is null or (immo_anteil_default >= 0 and immo_anteil_default <= 100)),
  add column if not exists parent_berater_id uuid references profiles(id) on delete set null,
  add column if not exists karriere_fenster_start timestamptz not null default now();

-- Monatsziel-Sperre (15.2: Berater setzt selbst, GF kann sperren)
alter table berater_monatsziele
  add column if not exists gesperrt boolean not null default false;

-- ---------------------------------------------------------------------
-- Stufenwechsel startet ein neues Karriere-Fenster (7.3: Fenster-Logik
-- ist reine Anzeige; der Start wird beim manuellen GF-Stufenwechsel gesetzt).
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
  update public.profiles
     set vertriebler_stufe = stufe,
         karriere_fenster_start = case
           when vertriebler_stufe is distinct from stufe then now()
           else karriere_fenster_start end
   where id = target;
end $$;

-- ---------------------------------------------------------------------
-- Anbindung setzen (GF-only): Immo-Default + übergeordneter Partner.
-- Eine Ebene (ANNAHME 8.2): der übergeordnete Partner darf selbst
-- keinen übergeordneten Partner haben.
-- ---------------------------------------------------------------------
create or replace function public.set_berater_anbindung(
  target uuid, p_immo_default numeric, p_parent uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_parent_parent uuid;
begin
  if not public.is_gf() then
    raise exception 'Nur die Geschäftsführung darf die Anbindung ändern.';
  end if;
  if p_immo_default is not null and (p_immo_default < 0 or p_immo_default > 100) then
    raise exception 'Immo-Anteil muss zwischen 0 und 100 liegen.';
  end if;
  if p_parent is not null then
    if p_parent = target then
      raise exception 'Ein Berater kann nicht sein eigener übergeordneter Partner sein.';
    end if;
    select parent_berater_id into v_parent_parent from public.profiles where id = p_parent;
    if v_parent_parent is not null then
      raise exception 'Nur eine Partner-Ebene: der gewählte Partner ist selbst untergeordnet.';
    end if;
    -- Zyklus/Ebene: target darf dann selbst keine Partner mehr haben
    if exists (select 1 from public.profiles where parent_berater_id = target) then
      raise exception 'Nur eine Partner-Ebene: dieser Berater hat bereits eigene Partner.';
    end if;
  end if;
  update public.profiles
     set immo_anteil_default = p_immo_default,
         parent_berater_id   = p_parent
   where id = target;
end $$;

grant execute on function public.set_berater_anbindung(uuid, numeric, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Monatsziel: Berater setzt das eigene Ziel selbst, solange nicht gesperrt.
-- GF-Schreibweg (0009-Policies) bleibt unverändert bestehen.
-- ---------------------------------------------------------------------
create or replace function public.set_eigenes_monatsziel(p_immo numeric, p_vv numeric)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_gesperrt boolean;
begin
  if p_immo is not null and p_immo < 0 then raise exception 'Ziel muss positiv sein.'; end if;
  if p_vv   is not null and p_vv   < 0 then raise exception 'Ziel muss positiv sein.'; end if;
  select gesperrt into v_gesperrt from public.berater_monatsziele where berater_id = auth.uid();
  if coalesce(v_gesperrt, false) then
    raise exception 'Dein Monatsziel wurde von der Geschäftsführung festgelegt und ist gesperrt.';
  end if;
  insert into public.berater_monatsziele (berater_id, monatsziel_immobilien, monatsziel_vv)
  values (auth.uid(), p_immo, p_vv)
  on conflict (berater_id) do update
    set monatsziel_immobilien = excluded.monatsziel_immobilien,
        monatsziel_vv         = excluded.monatsziel_vv,
        updated_at            = now();
end $$;

grant execute on function public.set_eigenes_monatsziel(numeric, numeric) to authenticated;

-- GF: Sperre umschalten (bewusst eigene, schmale Funktion)
create or replace function public.set_monatsziel_sperre(target uuid, p_gesperrt boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_gf() then
    raise exception 'Nur die Geschäftsführung darf Ziele sperren.';
  end if;
  insert into public.berater_monatsziele (berater_id, gesperrt)
  values (target, coalesce(p_gesperrt, false))
  on conflict (berater_id) do update
    set gesperrt = coalesce(p_gesperrt, false), updated_at = now();
end $$;

grant execute on function public.set_monatsziel_sperre(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- Backoffice-Rolle (2.5): Kontakte/Aufgaben/Akte verwalten, Deals lesen.
-- KEIN Zugriff auf Provisions-Setter (die prüfen weiterhin is_gf()).
-- ---------------------------------------------------------------------
create or replace function public.is_backoffice()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and rolle = 'backoffice' and aktiv
  );
$$;

grant execute on function public.is_backoffice() to authenticated;

-- Zusätzliche (additive) Policies — bestehende bleiben unberührt.
drop policy if exists "contacts_backoffice_select" on contacts;
create policy "contacts_backoffice_select" on contacts
  for select using (public.is_backoffice());
drop policy if exists "contacts_backoffice_insert" on contacts;
create policy "contacts_backoffice_insert" on contacts
  for insert with check (public.is_backoffice());
drop policy if exists "contacts_backoffice_update" on contacts;
create policy "contacts_backoffice_update" on contacts
  for update using (public.is_backoffice()) with check (public.is_backoffice());

drop policy if exists "deals_backoffice_select" on deals;
create policy "deals_backoffice_select" on deals
  for select using (public.is_backoffice());

drop policy if exists "history_backoffice_select" on deal_stage_history;
create policy "history_backoffice_select" on deal_stage_history
  for select using (public.is_backoffice());

drop policy if exists "tasks_backoffice_all" on tasks;
create policy "tasks_backoffice_all" on tasks
  for all using (public.is_backoffice()) with check (public.is_backoffice());

drop policy if exists "activities_backoffice_all" on contact_activities;
create policy "activities_backoffice_all" on contact_activities
  for all using (public.is_backoffice()) with check (public.is_backoffice());

drop policy if exists "docstatus_backoffice_all" on contact_document_status;
create policy "docstatus_backoffice_all" on contact_document_status
  for all using (public.is_backoffice()) with check (public.is_backoffice());

-- ---------------------------------------------------------------------
-- Partner-Ebene (8.1): Der übergeordnete Berater liest die DEALS seiner
-- direkten Partner (für „Meine Partner": Umsatz, Pipeline, Overhead).
-- Kontakte der Partner bleiben bewusst privat (2.2).
-- ---------------------------------------------------------------------
drop policy if exists "deals_downline_select" on deals;
create policy "deals_downline_select" on deals
  for select using (
    exists (
      select 1 from profiles p
      where p.id = deals.berater_id
        and p.parent_berater_id = auth.uid()
    )
  );
