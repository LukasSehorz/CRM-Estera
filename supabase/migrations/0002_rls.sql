-- =====================================================================
-- Estera CRM — RLS, Grants & Rollen-Policies (Migration 0002)
-- Phase 2. Setzt das Rechtekonzept in Postgres durch:
--   - Rolle 'berater'            -> NUR eigene contacts/deals (berater_id = auth.uid())
--   - Rolle 'geschaeftsfuehrung' -> sieht/bearbeitet ALLES
-- Frontend-Filter sind nur Komfort; die Wahrheit steht hier (RLS).
-- Idempotent geschrieben (drop policy if exists ... + create or replace).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Hilfsfunktion: Ist der aktuelle Nutzer Geschäftsführung?
-- SECURITY DEFINER, damit der Lesezugriff auf profiles NICHT erneut RLS
-- auslöst (sonst Endlos-Rekursion in den profiles-Policies).
-- ---------------------------------------------------------------------
create or replace function public.is_gf()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and rolle = 'geschaeftsfuehrung'
  );
$$;

-- Der Historie-Trigger muss in deal_stage_history schreiben können, auch
-- wenn ein 'berater' (DB-Rolle authenticated) einen Deal anlegt/ändert.
-- Daher als SECURITY DEFINER ausführen -> läuft als Eigentümer (postgres),
-- umgeht RLS & Grants der Historie-Tabelle. auth.uid() bleibt korrekt,
-- da es die JWT-Claims des Requests liest, nicht den Funktionskontext.
alter function public.track_deal_stage() security definer set search_path = public, pg_temp;

-- ---------------------------------------------------------------------
-- GRANTS (Hinweis aus Phase 1: ohne Grants kein Zugriff der App-Rollen)
-- ---------------------------------------------------------------------
grant usage on schema public to authenticated;

grant select on public.pipeline_stages    to authenticated;
grant select on public.profiles            to authenticated;
grant select, insert, update, delete on public.contacts to authenticated;
grant select, insert, update, delete on public.deals    to authenticated;
grant select on public.deal_stage_history  to authenticated;

grant execute on function public.is_gf() to authenticated;

-- ---------------------------------------------------------------------
-- RLS aktivieren (auf allen Tabellen)
-- ---------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.pipeline_stages    enable row level security;
alter table public.contacts           enable row level security;
alter table public.deals              enable row level security;
alter table public.deal_stage_history enable row level security;

-- ---------------------------------------------------------------------
-- PROFILES: eigenes Profil lesbar; GF liest alle.
-- Schreiben nur über Admin (service_role/postgres umgehen RLS) -> bewusst
-- keine write-Policy: verhindert u. a. Selbst-Hochstufung der eigenen Rolle.
-- ---------------------------------------------------------------------
drop policy if exists "profiles_select_own_or_gf" on public.profiles;
create policy "profiles_select_own_or_gf"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_gf());

-- ---------------------------------------------------------------------
-- PIPELINE_STAGES: Referenzdaten, für alle Angemeldeten lesbar.
-- Schreiben nur Admin.
-- ---------------------------------------------------------------------
drop policy if exists "pipeline_stages_select_all" on public.pipeline_stages;
create policy "pipeline_stages_select_all"
  on public.pipeline_stages for select to authenticated
  using (true);

-- ---------------------------------------------------------------------
-- CONTACTS: Berater nur eigene; GF alle.
-- ---------------------------------------------------------------------
drop policy if exists "contacts_select" on public.contacts;
create policy "contacts_select"
  on public.contacts for select to authenticated
  using (public.is_gf() or berater_id = auth.uid());

drop policy if exists "contacts_insert" on public.contacts;
create policy "contacts_insert"
  on public.contacts for insert to authenticated
  with check (public.is_gf() or berater_id = auth.uid());

drop policy if exists "contacts_update" on public.contacts;
create policy "contacts_update"
  on public.contacts for update to authenticated
  using (public.is_gf() or berater_id = auth.uid())
  with check (public.is_gf() or berater_id = auth.uid());

drop policy if exists "contacts_delete" on public.contacts;
create policy "contacts_delete"
  on public.contacts for delete to authenticated
  using (public.is_gf() or berater_id = auth.uid());

-- ---------------------------------------------------------------------
-- DEALS: analog zu contacts.
-- ---------------------------------------------------------------------
drop policy if exists "deals_select" on public.deals;
create policy "deals_select"
  on public.deals for select to authenticated
  using (public.is_gf() or berater_id = auth.uid());

drop policy if exists "deals_insert" on public.deals;
create policy "deals_insert"
  on public.deals for insert to authenticated
  with check (public.is_gf() or berater_id = auth.uid());

drop policy if exists "deals_update" on public.deals;
create policy "deals_update"
  on public.deals for update to authenticated
  using (public.is_gf() or berater_id = auth.uid())
  with check (public.is_gf() or berater_id = auth.uid());

drop policy if exists "deals_delete" on public.deals;
create policy "deals_delete"
  on public.deals for delete to authenticated
  using (public.is_gf() or berater_id = auth.uid());

-- ---------------------------------------------------------------------
-- DEAL_STAGE_HISTORY: lesbar, wenn der zugehörige Deal sichtbar ist.
-- Schreiben erfolgt ausschließlich über den (SECURITY DEFINER) Trigger.
-- ---------------------------------------------------------------------
drop policy if exists "deal_stage_history_select" on public.deal_stage_history;
create policy "deal_stage_history_select"
  on public.deal_stage_history for select to authenticated
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_stage_history.deal_id
        and (public.is_gf() or d.berater_id = auth.uid())
    )
  );
