-- =====================================================================
-- 0033 — Rechte-Hygiene: TRUNCATE/TRIGGER/REFERENCES entziehen
--
-- BEFUND: Supabase vergibt über ein Default-Privileg auf das Schema
-- `public` automatisch die Rechte D (TRUNCATE), x (REFERENCES),
-- t (TRIGGER) und m (MAINTAIN) an `anon` UND `authenticated` — auf jede
-- neu angelegte Tabelle. Betroffen waren alle 17 Tabellen, inklusive
-- contacts, contact_documents und dem neuen Zugriffsprotokoll.
--
-- WARUM DAS ZÄHLT:
--   * TRUNCATE umgeht Row Level Security VOLLSTÄNDIG. Wo ein DELETE an
--     der Policy scheitert, würde ein TRUNCATE die ganze Tabelle leeren.
--   * Auf dem Zugriffsprotokoll hebelt es den Zweck des Protokolls aus:
--     ein Protokoll, das der Protokollierte löschen kann, ist als
--     Nachweis (Art. 5 Abs. 2) wertlos.
--   * TRIGGER erlaubt es, eigenen Code an fremde Tabellen zu hängen.
--
-- EINSCHÄTZUNG DER AUSNUTZBARKEIT: über die normale Schnittstelle
-- (PostgREST) NICHT direkt auslösbar — die API kennt kein TRUNCATE. Das
-- Risiko ist also kein akuter offener Zugang, sondern ein zu weit
-- gefasstes Recht, das bei jeder Erweiterung (Direktverbindung, SQL-RPC,
-- durchgereichter Verbindungsstring) sofort scharf würde. Für die TOM-
-- Dokumentation nach Art. 32 ist „die Anwendungsrolle darf jede Tabelle
-- leeren" nicht vertretbar.
--
-- Die eigentlichen Arbeitsrechte (SELECT/INSERT/UPDATE/DELETE) bleiben
-- unverändert — die Anwendung merkt von dieser Migration nichts.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1) Bestand bereinigen: überflüssige Rechte auf allen vorhandenen
--    Tabellen entziehen.
-- ---------------------------------------------------------------------
do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format(
      'revoke truncate, trigger, references on public.%I from anon, authenticated',
      t.relname
    );
  end loop;
end $$;

-- `anon` hat in dieser Anwendung generell nichts zu suchen: Zugriff gibt
-- es ausschließlich nach Anmeldung. Explizit statt implizit.
do $$
declare
  t record;
begin
  for t in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p')
  loop
    execute format('revoke all on public.%I from anon', t.relname);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 2) Zukunft absichern: Default-Privilegien so ändern, dass NEUE
--    Tabellen diese Rechte gar nicht erst bekommen. Ohne diesen Schritt
--    wäre die nächste Migration wieder betroffen.
-- ---------------------------------------------------------------------
alter default privileges in schema public
  revoke truncate, trigger, references on tables from anon, authenticated;

alter default privileges in schema public
  revoke all on tables from anon;

-- ---------------------------------------------------------------------
-- 3) Das Zugriffsprotokoll zusätzlich hart gegen Manipulation sichern.
--    Nur SELECT für `authenticated` (die Policy beschränkt das weiter auf
--    die GF). Einträge entstehen ausschließlich über die SECURITY-
--    DEFINER-Funktion log_dokument_zugriff.
-- ---------------------------------------------------------------------
revoke all on public.dokument_zugriff_log from anon, authenticated;
grant select on public.dokument_zugriff_log to authenticated;

-- Auch die Sequenz des Protokolls darf niemand direkt anfassen.
revoke all on all sequences in schema public from anon;

commit;
