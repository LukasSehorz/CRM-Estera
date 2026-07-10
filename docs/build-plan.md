# Estera CRM — Build-Plan in Phasen

> Reihenfolge ist bewusst so gewählt, dass jede Phase die nächste absichert.
> Fundament und Sicherheit zuerst, Politur zuletzt.
> Immer nur die aktuelle Phase bearbeiten, danach zusammenfassen und auf
> Freigabe warten.

## Phase 0 — Setup (ca. 0,5 Tag)
Next.js + TS + Tailwind + shadcn initialisieren. Supabase-Projekt anlegen,
Clients (`server.ts`, `client.ts`, `middleware.ts`) einrichten. `CLAUDE.md`,
Ordnerstruktur, `.env.example`, `.gitignore`, README. Erstes Deploy auf Vercel
(leere App), damit die Pipeline früh steht.

## Phase 1 — Datenmodell + Seed (ca. 1 Tag)
Migration `0001_schema.sql` mit allen Tabellen aus `docs/datenmodell.md`,
inkl. `deal_stage_history` und dem Trigger, der die Historie automatisch
schreibt. `seed.sql` mit den 7 Beratern und allen Pipeline-Phasen.
TypeScript-Typen aus Supabase generieren.
**Checkpoint:** Schema steht, Seed lädt fehlerfrei, Historie-Trigger getestet.

## Phase 2 — Auth + RLS + Rollen (ca. 1–1,5 Tage, kritischste Phase)
Login-Seite, Session-Handling, Middleware-Schutz für `(dashboard)`.
RLS-Policies in `0002_rls.sql`: Berater sehen nur eigene `contacts`/`deals`,
GF sieht alles.
**Checkpoint, der nicht übersprungen wird:** Mit zwei Test-Beratern einloggen
und beweisen, dass Berater A die Daten von Berater B nicht sehen kann —
weder im UI noch über direkte Queries.

## Phase 3 — Kontakte (ca. 1,5 Tage)
Kontaktliste (filter-/sortierbar), Neuanlage, Detailseite mit allen Feldern aus
`docs/datenmodell.md`, sauber in Sektionen (Basis / Finanzdaten / Einschätzung /
Unterlagen), Sektionen ausblendbar. Server Actions zum Speichern.

## Phase 4 — Deals + Pipelines (ca. 1,5–2 Tage)
Zwei Kanban-Boards (Immobilien, VV) mit Drag&Drop. Karten zeigen: Berater,
Kaufpreis, Objekt-Adresse, Objekt-Status (Immo) bzw. die VV-Pendants.
Deal-Anlage verknüpft mit Kontakt, Bereich steuert die Felder. Phasenwechsel
schreibt Historie. Deal-Detailseite.

## Phase 5 — Fachkonzept-Erweiterung + Listen / Übersichten
Wegen des Fachkonzepts (Stand 26.06.2026) in Teilschritten:
- **5a — Datenmodell (Migration 0003):** neue Immobilien-Pipeline (T1/T2 …),
  VV-Felder (Sparbeitrag/Jahre/Factoring/Tippgeber-Satz), `vertriebler_stufe`
  (nur Admin/GF setzbar), `finanzierungsrahmen_betrag`. ✓
- **5b — VV-Provisionslogik:** `lib/provision.ts` (BWS→Provision→Factoring/
  Einbehalt→Tippgeber/Vertriebler/Haus, ratierlich) + Live-Vorschau im
  Deal-Formular/-Detail. ✓
- **5c — Admin:** GF setzt Vertriebler-Stufe je Berater.
- **Kundendokumente (1.2):** Upload je Kontakt (Storage, DSGVO) — eigener Baustein.
- **5d — Listen** (Spec Abschnitt 5 + Fachkonzept): übergreifend (alle Kontakte,
  nach Interesse, eingeschätzte Kunden nach Volumen, heiße Leads, offene Leads),
  pro Berater (Kontakte, Deals, Umsatz, Pipeline-Volumen), termin-/status-bezogen
  (Notartermine diese Woche, nächste Termine 7 Tage, Deals in Finanzierung,
  verkaufte Deals) sowie „mit/ohne Einbehalt" + offener Einbehalt je Kunde.

## Phase 6 — Dashboards (ca. 1,5 Tage)
Drei Dashboards aus Spec Abschnitt 7: Pipeline-Volumen (gesamt, pro Phase,
pro Berater, Konversionsraten, Deal-Time, Closing Rate), Berater-Performance,
eingeschätzte Kunden (filterbar nach Berater + Finanzierungsrahmen).
Analytics-Logik in `lib/analytics/`, basierend auf der Stage-Historie.

## Phase 7 — UI-Politur + Navigation + Onboarding (ca. 1 Tag)
Klare Trennung Immobilien/VV in der Sidebar. Konsolidierte Start-Übersicht.
Leere Zustände, Fehlerzustände, Ladeindikatoren. Durchgehend deutsche Texte,
korrekte €-/Datums-Formatierung. Onboarding-Check: Findet sich ein Neuer in
15 Minuten zurecht?

## Phase 8 — Deployment + Test + Kunden-Feedback (ca. 0,5–1 Tag)
Finales Deploy auf Kunden-Account (Vercel + Supabase). Echte Test-Durchläufe
entlang des Datenflusses aus Spec Abschnitt 9. Eine Feedback-Runde mit dem
Kunden einplanen, danach Feinschliff.
**Hier liegt der Puffer für „Mitte nächste Woche" statt „Montag".**

## Phasen 9–15 — Optimierungsrunde „Schleife 2" (Kundenfeedback Sebastian)
Detailplan + Traceability-Matrix: `docs/roadmap-schleife-2.md`. Reihenfolge
„erst korrekt, dann nützlich, dann skalierbar":
- **Phase 9 — Datenlogik:** Volumen≠Umsatz (Provision als Leitgröße), Storno-Fix
  im Funnel (bestätigter Bug), Immo-Provisionsfelder je Deal (Satz + Berater-Anteil,
  GF-only), Funnel-Labels, Konsistenz-Check, Plausibilitätswarnung. Migration 0005.
- **Phase 10 — Bereichs-Trennung + Rechte:** Dashboard-Switcher Immobilien/VV/Gesamt
  (alle Kennzahlen getrennt), Hausanteil für Berater unsichtbar, „Meine …"-Labels.
  Sparten-Sichtbarkeit je Berater (GF stellt Immo/VV/beide ein; RLS erzwingt es)
  inkl. Berater-Anlage direkt im CRM (Team-Seite). Migration 0006.
- **Phase 11 — Kundenakte:** Dokumenten-Checkliste (nur Immo, 3 Gruppen, Fortschritt),
  Activity-Timeline, Aufgaben, Finanzierungsstatus. Migration 0006. DSGVO-Schalter.
- **Phase 12 — Berater-Cockpit:** Heute-Ansicht, To-Dos, erwartete/gewichtete
  Provision je Bereich, SLA + Health-Ampel, klickbare KPIs. Migration 0007.
- **Phase 13 — Automatisierung:** Auto-Aufgaben je Statuswechsel (Templates 5.1).
- **Phase 14 — GF-Cockpit:** Forecast 30/60/90, Teamvergleich, Berater-Drilldown
  (klickbar, nur GF), Einbehalte-Übersicht, Stornoquote, Coaching-Signale,
  Provisionsvorschau komplett, Summen-Skala (nur GF).
- **Phase 15 — Abschluss:** Regression beide Rollen, Deploy, Feedback-Runde 3.

> **Stand 09.07.2026: Phasen 9–15 vollständig umgesetzt und verifiziert.**
> Regression (50 GF-Routen, Kernflüsse, RLS-Matrix, Zahlen-Kreuzcheck gegen
> die DB), Stresstest (Parallel-Last, Phasen-Hammer auf den Historie-Trigger,
> Task-Sturm) und Live-Smoke auf estera-crm.netlify.app bestanden.
> Invarianten-Prüfung: `node scripts/consistency-check.mjs` (vor jedem Deploy).
> OFFEN-Punkte für Sebastian: siehe docs/roadmap-schleife-2.md (Defaults aktiv).

---

## Kritischer Hinweis
Phase 1 und 2 (Datenmodell mit Historie + RLS-Rechtekonzept) sind zusammen
über die Hälfte des Erfolgsrisikos. Wenn die sauber stehen, ist der Rest
größtenteils Fleißarbeit. Dort lieber eine Stunde mehr ins Testen investieren
als am Ende unter Zeitdruck nachbauen.