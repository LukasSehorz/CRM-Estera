-- =====================================================================
-- 0032 — DSGVO-Härtung (Audit-Log, Leaver-Sperre, Rollen-Härtung)
--
-- Setzt die technischen Pflichten um, die für die Übergabe nötig sind:
--   A) Zugriffsprotokoll für Kundendokumente (Art. 5 Abs. 2, 30, 33)
--      Ohne Protokoll ist weder eine Auskunft nach Art. 15 noch eine
--      Meldung nach Art. 33 erstellbar. Schreiben über SECURITY DEFINER,
--      damit ein Berater protokollieren KANN, aber nichts lesen/ändern.
--   B) Leaver-Sperre: `aktiv = false` wird jetzt tatsächlich durchgesetzt.
--      Bisher existierte das Feld nur — ein ausgeschiedener Berater
--      behielt vollen Zugriff auf seine Kundenakten (Art. 32).
--   C) Rollenwechsel in eine SECURITY-DEFINER-Funktion verlagert. Bisher
--      lief er über den Service-Role-Key mit reiner App-Prüfung; ein
--      Logikfehler dort hätte Rechteausweitung bedeutet.
--   D) Policies ohne `to authenticated` nachgezogen (Defense in Depth).
--
-- BEWUSST NICHT ENTHALTEN: automatische Löschung nach Fristen. Fristen
-- legt der Verantwortliche fest (Kollision DSGVO Art. 17 vs. § 8 GwG,
-- 5 Jahre Aufbewahrung für Ausweiskopien). Bis zur Klärung wird nichts
-- automatisch gelöscht — Aufbewahren ist der sichere Zustand.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- B) Leaver-Sperre — Hilfsfunktion
-- ---------------------------------------------------------------------
create or replace function public.is_aktiv()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select aktiv from public.profiles where id = auth.uid()),
    false
  );
$$;
grant execute on function public.is_aktiv() to authenticated;

comment on function public.is_aktiv() is
  'Ist der aktuelle Nutzer ein AKTIVES Profil? Deaktivierte Konten (Leaver) '
  'verlieren damit sofort jeden Datenzugriff, auch wenn die Session noch gilt.';

-- Auch die GF-Prüfung setzt jetzt ein aktives Konto voraus.
create or replace function public.is_gf()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and rolle = 'geschaeftsfuehrung'
      and aktiv
  );
$$;

-- Finanzierer analog: deaktiviert = kein Zugriff mehr auf Freigaben.
create or replace function public.is_finanzierer()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and rolle = 'finanzierer'
      and aktiv
  );
$$;

-- ---------------------------------------------------------------------
-- A) Zugriffsprotokoll für Kundendokumente
-- ---------------------------------------------------------------------
create table if not exists public.dokument_zugriff_log (
  id           bigint generated always as identity primary key,
  -- Kein FK auf contact_documents: das Protokoll muss die Löschung des
  -- Dokuments ÜBERLEBEN — sonst ist gerade der Löschvorgang nicht mehr
  -- nachweisbar (Art. 5 Abs. 2).
  document_id  uuid,
  contact_id   uuid,
  aktion       text not null
                 check (aktion in ('upload', 'download', 'delete',
                                   'zip_export', 'freigabe_erteilt',
                                   'freigabe_entzogen')),
  dateiname    text,
  akteur_id    uuid references public.profiles(id) on delete set null,
  akteur_rolle text,
  created_at   timestamptz not null default now()
);

create index if not exists idx_zugriff_log_contact
  on public.dokument_zugriff_log (contact_id, created_at desc);
create index if not exists idx_zugriff_log_akteur
  on public.dokument_zugriff_log (akteur_id, created_at desc);
create index if not exists idx_zugriff_log_zeit
  on public.dokument_zugriff_log (created_at desc);

comment on table public.dokument_zugriff_log is
  'Wer hat wann welches Kundendokument hochgeladen, geöffnet oder gelöscht? '
  'Pflicht für Art. 15 (Auskunft) und Art. 33 (Meldung einer Datenpanne). '
  'Schreiben ausschließlich über log_dokument_zugriff(), Lesen nur GF.';

alter table public.dokument_zugriff_log enable row level security;

-- Nur LESEN wird gewährt — und das nur der GF. Kein insert/update/delete
-- für `authenticated`: Einträge entstehen ausschließlich über die
-- SECURITY-DEFINER-Funktion, damit niemand das Protokoll fälschen oder
-- Spuren verwischen kann.
grant select on public.dokument_zugriff_log to authenticated;

drop policy if exists zugriff_log_select on public.dokument_zugriff_log;
create policy zugriff_log_select on public.dokument_zugriff_log
  for select to authenticated
  using (public.is_gf());

-- Schreib-Funktion: protokolliert immer den AUFRUFER, nie einen
-- übergebenen Wert — so kann sich niemand als jemand anderes eintragen.
create or replace function public.log_dokument_zugriff(
  p_document_id uuid,
  p_contact_id  uuid,
  p_aktion      text,
  p_dateiname   text default null
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rolle text;
begin
  if auth.uid() is null then
    return;  -- ohne Session wird nicht protokolliert
  end if;
  select rolle::text into v_rolle from public.profiles where id = auth.uid();

  insert into public.dokument_zugriff_log
    (document_id, contact_id, aktion, dateiname, akteur_id, akteur_rolle)
  values
    (p_document_id, p_contact_id, p_aktion, p_dateiname, auth.uid(), v_rolle);
exception
  -- Das Protokoll darf den fachlichen Vorgang NIE blockieren. Schlägt das
  -- Schreiben fehl, läuft der Download trotzdem durch.
  when others then
    return;
end $$;

grant execute on function public.log_dokument_zugriff(uuid, uuid, text, text)
  to authenticated;

-- ---------------------------------------------------------------------
-- B) Leaver-Sperre auf die datenführenden Tabellen anwenden
--     Muster: bestehende Bedingung bleibt, `is_aktiv()` kommt davor.
-- ---------------------------------------------------------------------

-- CONTACTS
drop policy if exists "contacts_select" on public.contacts;
create policy "contacts_select" on public.contacts
  for select to authenticated
  using (public.is_aktiv() and (public.is_gf() or berater_id = auth.uid()));

drop policy if exists "contacts_insert" on public.contacts;
create policy "contacts_insert" on public.contacts
  for insert to authenticated
  with check (public.is_aktiv() and (public.is_gf() or berater_id = auth.uid()));

drop policy if exists "contacts_update" on public.contacts;
create policy "contacts_update" on public.contacts
  for update to authenticated
  using (public.is_aktiv() and (public.is_gf() or berater_id = auth.uid()))
  with check (public.is_aktiv() and (public.is_gf() or berater_id = auth.uid()));

drop policy if exists "contacts_delete" on public.contacts;
create policy "contacts_delete" on public.contacts
  for delete to authenticated
  using (public.is_aktiv() and (public.is_gf() or berater_id = auth.uid()));

-- DEALS (eigene + Downline)
drop policy if exists "deals_select" on public.deals;
create policy "deals_select" on public.deals
  for select to authenticated
  using (public.is_aktiv() and (public.is_gf() or berater_id = auth.uid()));

drop policy if exists "deals_downline_select" on public.deals;
create policy "deals_downline_select" on public.deals
  for select to authenticated
  using (public.is_aktiv() and public.is_ancestor(auth.uid(), deals.berater_id));

drop policy if exists "deals_insert" on public.deals;
create policy "deals_insert" on public.deals
  for insert to authenticated
  with check (public.is_aktiv() and (public.is_gf() or berater_id = auth.uid()));

drop policy if exists "deals_update" on public.deals;
create policy "deals_update" on public.deals
  for update to authenticated
  using (public.is_aktiv() and (public.is_gf() or berater_id = auth.uid()))
  with check (public.is_aktiv() and (public.is_gf() or berater_id = auth.uid()));

drop policy if exists "deals_delete" on public.deals;
create policy "deals_delete" on public.deals
  for delete to authenticated
  using (public.is_aktiv() and (public.is_gf() or berater_id = auth.uid()));

-- KUNDENDOKUMENTE (Metadaten)
drop policy if exists "contact_documents_select" on public.contact_documents;
create policy "contact_documents_select" on public.contact_documents
  for select to authenticated
  using (
    public.is_aktiv() and exists (
      select 1 from public.contacts c
      where c.id = contact_id and (public.is_gf() or c.berater_id = auth.uid())
    )
  );

drop policy if exists "contact_documents_insert" on public.contact_documents;
create policy "contact_documents_insert" on public.contact_documents
  for insert to authenticated
  with check (
    public.is_aktiv() and exists (
      select 1 from public.contacts c
      where c.id = contact_id and (public.is_gf() or c.berater_id = auth.uid())
    )
  );

drop policy if exists "contact_documents_delete" on public.contact_documents;
create policy "contact_documents_delete" on public.contact_documents
  for delete to authenticated
  using (
    public.is_aktiv() and exists (
      select 1 from public.contacts c
      where c.id = contact_id and (public.is_gf() or c.berater_id = auth.uid())
    )
  );

-- STORAGE: die Dateien selbst (Ausweise, Gehaltsnachweise, Steuerbescheide)
drop policy if exists "kundendokumente_select" on storage.objects;
create policy "kundendokumente_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'kundendokumente'
    and public.is_aktiv()
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
    and public.is_aktiv()
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
    and public.is_aktiv()
    and exists (
      select 1 from public.contacts c
      where c.id = ((storage.foldername(name))[1])::uuid
        and (public.is_gf() or c.berater_id = auth.uid())
    )
  );

-- Finanzierer-Download: deaktivierter Finanzierer verliert den Zugriff.
drop policy if exists finanzierer_download on storage.objects;
create policy finanzierer_download on storage.objects
  for select to authenticated
  using (
    bucket_id = 'kundendokumente'
    and public.is_aktiv()
    and exists (
      select 1
      from public.document_freigaben f
      join public.contact_documents d on d.id = f.document_id
      where f.finanzierer_id = auth.uid()
        and d.storage_path = storage.objects.name
    )
  );

-- TIPPGEBER
drop policy if exists "tippgeber_select" on public.tippgeber;
create policy "tippgeber_select" on public.tippgeber
  for select to authenticated
  using (
    public.is_aktiv() and (
      public.is_gf()
      or owner_id = auth.uid()
      or public.is_ancestor(auth.uid(), owner_id)
    )
  );

-- ---------------------------------------------------------------------
-- D) Policies ohne Rollenangabe nachziehen (griffen auf PUBLIC statt
--    `authenticated`). Aktuell ungefährlich, weil `anon` keine Grants
--    hat — aber ein versehentlicher Grant würde sofort alles öffnen.
-- ---------------------------------------------------------------------
drop policy if exists freigaben_select on public.document_freigaben;
create policy freigaben_select on public.document_freigaben
  for select to authenticated
  using (public.is_aktiv() and (public.is_gf() or finanzierer_id = auth.uid()));

drop policy if exists freigaben_insert on public.document_freigaben;
create policy freigaben_insert on public.document_freigaben
  for insert to authenticated
  with check (public.is_gf() and freigegeben_von = auth.uid());

drop policy if exists freigaben_delete on public.document_freigaben;
create policy freigaben_delete on public.document_freigaben
  for delete to authenticated
  using (public.is_gf());

-- ---------------------------------------------------------------------
-- C) Rollenwechsel + Deaktivierung als SECURITY-DEFINER-Funktionen.
--    Die Berechtigung erzwingt jetzt die DB, nicht mehr die App.
-- ---------------------------------------------------------------------
create or replace function public.set_berater_rolle(
  p_target uuid,
  p_rolle  text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ziel_rolle text;
begin
  if not public.is_gf() then
    raise exception 'Nur die Geschäftsführung darf Rollen ändern.';
  end if;
  if p_rolle not in ('berater', 'backoffice', 'finanzierer') then
    raise exception 'Ungültige Rolle: %', p_rolle;
  end if;

  select rolle::text into v_ziel_rolle from public.profiles where id = p_target;
  if v_ziel_rolle is null then
    raise exception 'Profil nicht gefunden.';
  end if;
  -- Die GF-Rolle bleibt unangetastet (kein Herabstufen der Geschäftsführung).
  if v_ziel_rolle = 'geschaeftsfuehrung' then
    raise exception 'Die Geschäftsführungs-Rolle kann hier nicht geändert werden.';
  end if;

  update public.profiles
     set rolle = p_rolle::public.rolle_enum
   where id = p_target;
end $$;
grant execute on function public.set_berater_rolle(uuid, text) to authenticated;

-- Leaver-Prozess: Konto deaktivieren/reaktivieren (GF-only). Es werden
-- KEINE Daten gelöscht — der Zugang wird gesperrt, die Kundenakten
-- bleiben der GF erhalten (Nachvollziehbarkeit + Aufbewahrungspflichten).
create or replace function public.set_berater_aktiv(
  p_target uuid,
  p_aktiv  boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_gf() then
    raise exception 'Nur die Geschäftsführung darf Konten sperren oder freigeben.';
  end if;
  if p_target = auth.uid() then
    raise exception 'Das eigene Konto kann nicht gesperrt werden.';
  end if;
  if exists (select 1 from public.profiles
              where id = p_target and rolle = 'geschaeftsfuehrung') then
    raise exception 'Die Geschäftsführung kann hier nicht gesperrt werden.';
  end if;

  update public.profiles set aktiv = p_aktiv where id = p_target;
end $$;
grant execute on function public.set_berater_aktiv(uuid, boolean) to authenticated;

commit;
