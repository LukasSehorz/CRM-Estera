# Estera CRM — Projekt-Kontext & Regeln

## Was wir bauen
Ein individuell programmiertes CRM für die Estera GmbH (Kapitalanlage-
Immobilien + Vermögensverwaltung). KEIN Maklersoftware-Klon — also KEINE
Objektverwaltung, Exposé-Erstellung oder OpenImmo-Portalanbindung. Es ist ein
VERTRIEBS-CRM: Leads, zwei Pipelines, Finanzierungs-Tracking, Berater-
Performance, Reporting.
Das verbindliche Designsystem für das gesamte Frontend liegt in
docs/design-system.md. Ab Phase 3 wird jede UI exakt nach diesem Dokument
gebaut (Farben, Typografie, Karten, Charts, Dark/Light). Im Zweifel dort
nachsehen, nicht raten.

Die vollständige fachliche Spezifikation liegt in `docs/anforderungen.md`.
Dieses Dokument ist die verbindliche Source of Truth. Bei jedem Zweifel:
dort nachsehen, nicht raten. Wenn etwas in der Spec unklar ist, STOPPEN und
nachfragen, statt eine Annahme zu treffen.

## Tech-Stack (fix, nicht ändern ohne Rückfrage)
- Next.js 15 (App Router) + TypeScript (strict)
- Tailwind CSS + shadcn/ui für Komponenten
- Supabase: Postgres + Auth + Row Level Security (RLS)
- Deployment: Vercel (App) + Supabase (DB), beides auf KUNDEN-Account
- State/Data: Server Components + Server Actions wo möglich,
  TanStack Query nur wo Client-seitig nötig (z.B. Kanban Drag&Drop)

## Eiserne Regeln
1. SICHERHEIT VOR ALLEM: Das Rechte-Konzept ist geschäftskritisch. Jeder
   Berater darf NUR seine eigenen Kontakte und Deals sehen. Die
   Geschäftsführung (Rolle 'geschaeftsfuehrung') sieht alles. Das wird über
   Postgres RLS durchgesetzt, NICHT nur im Frontend. Frontend-Filter sind
   Komfort, RLS ist die Wahrheit. Niemals eine Tabelle ohne RLS-Policy.
2. STAGE-HISTORY VON ANFANG AN: Jeder Phasenwechsel eines Deals wird mit
   Zeitstempel in `deal_stage_history` protokolliert. Ohne diese Historie
   sind Deal-Time, Konversionsraten und Closing Rate später nicht
   berechenbar. Das wird in Phase 1 angelegt und ab dem ersten Deal befüllt.
3. KEIN SCOPE CREEP: Nur bauen, was in der Spec steht. Keine zusätzlichen
   Felder, Module oder "nice to have"-Features ohne Rückfrage.
4. AUSBLENDBARKEIT: Die UI muss schlank sein. Felder/Sektionen, die nicht
   gebraucht werden, sind ausblendbar. Keine überladenen Standard-Layouts.
5. PHASENWEISE ARBEITEN: Immer nur die aktuelle Phase aus dem Build-Plan
   bearbeiten. Nach jeder Phase: zusammenfassen was gebaut wurde, dann auf
   Freigabe warten. Nicht vorpreschen.

## Konventionen
- Sprache: ALLE UI-Texte, Labels, Buttons, Fehlermeldungen auf DEUTSCH.
  Code-Bezeichner (Variablen, Funktionen, Tabellen, Spalten) auf ENGLISCH
  bzw. snake_case für DB. Kommentare auf Deutsch erlaubt.
- Geldbeträge: in der DB als numeric(14,2) speichern, im UI immer als
  "1.234.567 €" formatiert (de-DE locale). Niemals als float.
- Datumsfelder: timestamptz in der DB, im UI als TT.MM.JJJJ.
- Enums: zentral in `src/config/enums.ts` definieren, exakt mit den Werten
  aus der Spec. DB nutzt postgres enums oder check constraints.
- Pipeline-Phasen + Wahrscheinlichkeiten: in `pipeline_stages` Tabelle,
  Seed exakt nach Spec. Nicht hardcoden in Komponenten.
- Commits: nach jeder abgeschlossenen Teilaufgabe ein klarer Commit
  (deutsch oder englisch, konsistent), z.B. "feat: Kontakt-CRUD + Detailseite".

## Definition of Done (pro Feature)
- Funktioniert für Rolle 'berater' UND 'geschaeftsfuehrung' korrekt
- RLS getestet: Berater A sieht NICHT die Daten von Berater B
- Alle Felder aus der Spec vorhanden und gespeichert
- Loading- und Fehlerzustände vorhanden (keine weißen Seiten bei Fehler)
- UI deutsch, Beträge/Daten korrekt formatiert
- Responsiv und aufgeräumt (Onboarding-Ziel: in 15 Min verständlich)

## Was du NICHT tust
- Keine Secrets/Keys in den Code committen (nur .env.local, .gitignore prüfen)
- Keine Daten löschen ohne explizite Bestätigung
- Keine Migration "im Kopf" ändern — immer über supabase/migrations
- Keine Annahmen über fehlende Spec-Punkte — nachfragen