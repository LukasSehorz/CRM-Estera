# Roadmap „Schleife 2" — Umsetzungsplan Optimierungsdokument (Sebastian, Phase 4)

> Grundlage: „Estera-CRM-Optimierungen Schleife 2" (PDF) + zwei Zusatzanforderungen
> von Lukas (Bereichs-Trennung aller Dashboards, Berater-Drilldown).
> Leitprinzip aus dem Dokument: **„Correctness first, Experience second."**
> Dieses Dokument ist die Traceability-Referenz: JEDE Anforderung hat eine Phase.

## Phasenübersicht (Fortsetzung des Build-Plans)

| Phase | Inhalt | Quelle | Priorität |
|---|---|---|---|
| 9 | Datenlogik korrigieren (Volumen≠Umsatz, Storno-Fix, Immo-Provision, Konsistenz) | Kap. 1 | HOCH |
| 10 | Bereichs-Trennung aller Dashboards + Rollen/Rechte schärfen | Kap. 2 + Lukas A | HOCH |
| 11 | Kontaktseite als Kundenakte (Dokumente, Timeline, Finanzierungsstatus) | Kap. 3 | HOCH |
| 12 | Berater-Cockpit: Heute-Ansicht, To-Dos, erwartete Provision, SLA + Ampel | Kap. 4 | HOCH |
| 13 | Automatisierung: Auto-Aufgaben je Statuswechsel | Kap. 5 | MITTEL |
| 14 | GF-Cockpit: Forecast, Summen-Skala, Einbehalte, Storno + Berater-Drilldown | Kap. 6 + Lukas B | MITTEL |
| 15 | Regression (RLS-E2E beide Rollen), Doku, Deploy, Feedback-Runde 3 | — | — |

---

## Phase 9 — Datenlogik korrigieren (Kap. 1)

**Migration 0005:**
- `deals.provisionssatz numeric(5,2)` — Estera-Satz % auf Kaufpreis, nur Immobilien,
  manuell je Deal, UI-Schnellauswahl 12/14/25 (1.5).
- `deals.berater_anteil numeric(5,2)` — 1–10 %, **nur GF setzbar** (SECURITY-DEFINER-
  Funktion analog `set_vertriebler_stufe`) (1.5).

**Rechenkern (`lib/provision.ts` erweitern):**
- `computeImmoProvision(kaufpreis, satz, beraterAnteil)` — Rechenkette **parametrierbar**
  (OFFEN #2): Default `MODUS = "anteil_von_provision"` (Berater-Anteil × Estera-Provision,
  analog VV); Alternative `"anteil_von_kaufpreis"` per Konstante umschaltbar.
- Zentrale Helfer für das GANZE System (Single Source of Truth, 1.2):
  - `dealVolumen(deal)` = Kaufpreis (Immo) bzw. BWS (VV) → „Transaktionsvolumen".
  - `dealUmsatz(deal)` = Estera-Umsatz: Immo `kaufpreis × provisionssatz`,
    VV Hausanteil aus bestehender Kette (1.1).
  - `dealBeraterProvision(deal)` = eigener Anteil des Beraters (für Berater-Sicht).

**Analytics-Fixes (`lib/analytics.ts`):**
- **Storno-Fix (1.3, bestätigter Bug):** Deals mit aktueller `is_lost`-Phase werden aus
  JEDEM „gewonnen/abgeschlossen"-Zähler ausgeschlossen — konkret: im Funnel zählt die
  Won-Phase nur Deals, deren aktuelle Phase `is_won` ist. (Ursache: Seeds/Verläufe, die
  vor „Storniert" die Won-Phase durchliefen, blähten `reachedMax` auf → 8 vs. 11.)
- **Volumen ≠ Umsatz (1.1):** alle KPIs/Charts, die „Umsatz" heißen, rechnen auf
  `dealUmsatz` (Provision); „Volumen" bleibt `dealVolumen`, sekundär dargestellt.
- **Funnel-Label (1.4):** Funnel heißt sichtbar „je erreicht (kumulativ)", Kanban
  „aktuell in Phase"; im Pipeline-Tab werden beide Zahlen je Phase ausgewiesen.
- **Konsistenz-Check (1.2):** Skript `scripts/consistency-check.mjs` (bleibt im Repo):
  prüft u. a. „Σ gewonnene je Bereich = KPI", „Funnel-Won = KPI-Won", „Umsatz-KPI =
  Σ dealUmsatz(won)". Läuft vor jedem Deploy.
- **Plausibilitätswarnung (1.6):** Flag/Pill „⚠ Betrag > Rahmen" überall, wo
  eingeschätzte Kunden gelistet werden + Hinweis im Kontaktformular beim Speichern.

## Phase 10 — Bereichs-Trennung + Rollen & Rechte (Kap. 2 + Lukas A)

**Bereichs-Trennung (Lukas, deckt auch 4.2/6.2-Vorgabe „je Bereich getrennt"):**
- Segmented-Switcher **[ Immobilien | Vermögensverwaltung | Gesamt ]** oben auf allen
  Dashboard-Tabs; ALLE Kennzahlen (Umsatz, Closing Rate, Ø Deal-Time, Konversion,
  Funnel, Trend, Quelle) werden je Bereich getrennt berechnet und angezeigt.
  „Gesamt" = kombinierte Summen nur dort, wo Addition fachlich sinnvoll ist (Umsatz,
  Provision, Anzahl); Raten (Closing, Konversion) werden bei „Gesamt" je Bereich
  nebeneinander gezeigt, nicht vermischt.
- Analytics-Funktionen erhalten durchgängig einen `bereich`-Parameter.

**Sparten-Sichtbarkeit je Berater (Lukas C):**
- Nutzt das vorhandene Feld `profiles.bereich bereich_enum[]` (0001, bisher ungenutzt).
- **Team-Seite (GF-only) wird zur Team-Verwaltung:**
  - **Berater anlegen** direkt im CRM: Name, E-Mail, Start-Passwort, Stufe und
    Sparten-Auswahl (nur Immobilien / nur VV / beide). Serverseitige Action mit
    GF-Prüfung + Supabase-Admin-API (Service-Key bleibt server-only, nie im Client).
  - Für bestehende Berater: Sparten jederzeit umschaltbar (mind. eine aktiv);
    Änderung nur durch GF (SECURITY-DEFINER-Funktion analog `set_vertriebler_stufe`).
- **Durchsetzung — RLS ist die Wahrheit (Migration 0006):** deals-Policies erweitert:
  Berater sieht/erstellt/ändert nur Deals, deren `bereich` in seinen Sparten liegt;
  GF unverändert alles. Entzieht die GF eine Sparte, verschwinden deren Deals für den
  Berater — die GF sieht sie weiter und kann sie neu zuweisen.
- **UI folgt der Sparte:** Sidebar zeigt nur freigeschaltete Boards, Deal-Anlage
  bietet nur erlaubte Bereiche, Dashboard-Switcher/Listen blenden gesperrte Sparte
  aus. Kontakte bleiben besitzerbasiert sichtbar (das Interesse-Feld ist davon
  unabhängig — Leads mit fremdem Sparten-Interesse kann die GF umverteilen).

**Rollen schärfen (2.1–2.3):**
- Berater sieht: eigene Deals/Kontakte/Pipeline, eigene Provision je Deal, eigenen
  Tippgeber-Abzug, eigene Einbehalte inkl. Auszahlungsdatum, eigene Closing/Deal-Time/
  Konversion/Funnel (Datenbasis ist durch RLS bereits „nur eigene" — wird per E2E belegt).
- Berater sieht NIE: **Hausanteil/Estera-Umsatz** (Provision-Vorschau im Formular,
  Deal-Detail-Aufschlüsselung, alle Dashboards — Zeile wird rollenbasiert entfernt),
  fremde Provisionen/Stufen/Einbehalte, Firmen-Summen (2.2, Leck schließen).
- Begriffe in Berater-Rolle: „Meine Pipeline", „Mein Umsatz (Provision)" statt
  „gesamt" (LECK 2).
- „Umsatz nach Quelle" mit 0 Abschlüssen: Karte ausblenden (4.6, hier mitgemacht).
- **ZUKUNFT (nicht bauen):** Meeting-Modus (2.4), Backoffice-Rolle (2.5) — Rollen-Enum
  bleibt erweiterbar.

## Phase 11 — Kontaktseite als Kundenakte (Kap. 3)

**Migration 0007:**
- `contacts.finanzierungsstatus` enum (`offen`/`in_pruefung`/`zugesagt`) (3.4).
- `contacts.ist_selbststaendig bool`, `contacts.ist_immobilienbesitzer bool` (steuert
  sichtbare Dokument-Gruppen, 3.2).
- `document_types` (Katalog: 3 Gruppen, Reihenfolge, aktiv) + Seed exakt nach
  Checkliste 3.2 (10 allgemein / 4 selbstständig / 3 immobilienbesitzer).
- `contact_document_status` (contact_id, document_type_id, vorhanden bool,
  document_id → contact_documents, updated_at) — Status nur „vorhanden/fehlt" (3.1).
- `contact_activities` (contact_id, typ: anruf/mail/whatsapp/notiz/system, text,
  created_by, created_at) (3.5).
- `tasks` (id, titel, faellig_am, erledigt, contact_id NULL, deal_id NULL, owner_id,
  created_at) — schon hier, weil die Akte Aufgaben zeigt; UI-Vollausbau in Phase 12 (4.3).
- RLS auf allen neuen Tabellen (Berater nur eigene Kontakte/Aufgaben, GF alles).

**Kontaktseite (Akte, 3.4):** Sektionen Stammdaten · Dokumente (NUR bei Interesse
Immobilien, 3.1) · Timeline · Aufgaben · Deals des Kunden · Finanzierungsstatus-Badge.
- Dokumente: Checkliste mit Haken „vorhanden/fehlt", optional Datei-Upload je Punkt
  (nur Berater lädt hoch), Fortschritt **„6 von 8 Dokumenten"** + Balken; derselbe
  Zähler als Badge auf Immobilien-Deal-Karten und in der Kontaktliste (3.1).
- Fehlende Dokumente blockieren NICHTS (3.1) — nur Sichtbarkeit (Ampel in Phase 12).
- Timeline: automatische Einträge (Phasenwechsel des Deals, Dokument hochgeladen,
  Status-/Terminwechsel) + manuelle Einträge (Anruf/Mail/WhatsApp/Notiz) (3.5).
- **DSGVO (3.3, OFFEN #1):** Modul wird gebaut, aber der Datei-Upload bleibt hinter
  einem Feature-Schalter, bis Speicherort/Löschkonzept/Einwilligung geklärt sind
  (Checkliste „vorhanden/fehlt" funktioniert auch ohne Datei). Supabase-Region wird
  dokumentiert. **ZUKUNFT:** Kunden-Upload-Portal per Token-Link — Architektur
  berücksichtigt (Pfadschema + getrennte Policies), nicht gebaut.

## Phase 12 — Berater-Cockpit & To-Dos (Kap. 4)

**Migration 0008:** `pipeline_stages.sla_tage numeric` (Defaults laut 4.4, GF-seitig
änderbar): Neuer Lead 7 · T1 48 h (2) · T2→Finanzierung 3 („so schnell wie möglich",
enger Default, anpassbar) · Finanzierung in Prüfung 14 · Objekt reserviert 5 ·
Notartermin 21. (OFFEN #7: Zeiten von Sebastian bestätigen — nur DB-Werte ändern.)

- **„Heute"-Ansicht (4.1)** als Startblock des Berater-Dashboards: heute fällige +
  überfällige Aufgaben, Termine des Tages (nächster Termin/Notartermin), fehlende
  Dokumente (nur Immo), Deals ohne Aktivität seit X Tagen.
- **Erwartete Provision prominent (4.2)** — vier Kacheln, **je Bereich getrennt +
  Gesamt** (nutzt Phase-9-Rechenkern): Pipeline-Volumen · Erwartete Provision (voll) ·
  Gewichtete erwartete Provision (× Phasen-Wahrscheinlichkeit) · Offene Einbehalte
  inkl. Auszahlungsdatum (+12 Monate). Berater sieht nur SEINE Anteile.
- **To-Do-Block (4.3, Pflicht):** Aufgaben mit Fälligkeit, optionale Zuordnung zu
  Kontakt/Deal ODER frei; Sortierung überfällig → heute → diese Woche; zentrale
  Aufgabenliste über alle Deals.
- **Deal-Age & SLA (4.4):** „Tage in Phase" je Deal; Überschreitung sortiert nach oben.
- **Deal Health Ampel (4.5):** 🟢 in Frist UND Aktivität < 3 Tage · 🟡 Frist nähert
  sich ODER Dokument fehlt (nur Immo) ODER keine offene Aufgabe · 🔴 Frist überschritten
  ODER lange keine Aktivität. Sichtbar auf Board-Karten + Listen.
- **UX (4.6):** klickbare KPIs (Kachel → gefilterte Liste), Statusfarben statt
  Dauer-Lila.
- **Bewusst NICHT (4.7):** keine Pflicht-Blockaden, keine automatischen GF-Eskalationen.

## Phase 13 — Automatisierungen (Kap. 5)

- Auto-Aufgaben je Statuswechsel (Vorgabe: „wenn leicht, beides" — ist bei uns leicht,
  da Statuswechsel durch eine Server Action läuft): Templates exakt nach Tabelle 5.1
  (T1: Konzepttermin 48 h · T2: Checkliste senden/Dokumente anfordern · reserviert:
  Notartermin anfragen/Unterlagen prüfen · Finanzierung: Nachweise prüfen 14 Tage ·
  Notartermin: Datum/Fristen/Erinnerung). VV analog light, ohne Dokument-Aufgaben.
- Templates zentral in `src/config/task-templates.ts`, je Vorlage deaktivierbar;
  manuelles To-Do-System (Phase 12) bleibt davon unabhängig voll funktionsfähig.

## Phase 14 — GF-Cockpit & Berater-Drilldown (Kap. 6 + Lukas B)

- **Forecast:** gewichtete **Provision** (nicht Volumen) 30/60/90 Tage.
- **Teamvergleich:** Umsatz, Ø Deal-Größe, Deal-Time, Closing, Konversion je Berater —
  je Bereich getrennt (Switcher aus Phase 10).
- **Berater-Drilldown (Lukas B):** überall, wo ein Beratername in GF-Dashboards
  auftaucht (Tabelle, Balken, Listen) → Klick öffnet `/dashboard/berater/[id]`
  (**nur GF**; Berater erreichen fremde Seiten nicht — 2.2): komplette Personalakte
  Vertrieb: KPIs je Bereich, eigener Funnel + Konversion, offene Deals mit Health,
  Kontakte, Umsatz-Trend, offene Einbehalte, Stornoquote, Stufe (Link Team & Stufen),
  letzte Aktivität.
- **Einbehalte-Übersicht:** offene Einbehalte je Berater/Kunde mit Fälligkeitsdatum;
  „Erinnerung" = Fälligkeits-Badge + Eintrag im Heute-Block (keine E-Mails).
- **Stornoquote** je Berater und gesamt (storniert ÷ entschieden).
- **Coaching-Signale:** Panel mit Auffälligkeiten (hohe Pipeline + 0 Abschlüsse,
  überfällige/festhängende Deals) — reine Anzeige, keine Eskalation (4.7).
- **Provisionsvorschau vervollständigen (6.1):** + Tippgeber-Zeile, + Zeile
  „ratierlich: … €/Monat (60 Monate)". Defaults bis Klärung (OFFEN #4/#5):
  Tippgeber von der Netto-Provision; ratierlich und Einbehalt werden getrennt
  ausgewiesen, nicht verrechnet.
- **Summen-Skala (6.2, NUR GF, je Bereich + gesamt):** Summe X (nach Factoring) →
  − Einbehalt → − Tippgeber → − Berater-Provision = **Estera-Netto (Hausanteil)**.
  Default (OFFEN #3): Hausanteil = 100 % − Stufe, Factoring zuerst (= heutige Logik).
- **Leadquellen:** Umsatz (Provision) nach Quelle je Bereich. **ROI je Kanal:** braucht
  Kanal-Kosten, die es im System nicht gibt → OFFEN #8: minimale Kostenerfassung
  (Monat × Kanal × Betrag, nur GF) auf Zuruf — bis dahin Umsatz/Anteil je Quelle.

## Phase 15 — Abschluss
Typecheck + Konsistenz-Check + E2E beide Rollen (RLS-Beweis: Hausanteil im
Berater-DOM nicht vorhanden), Doku-Update, Netlify-Deploy (IPv4-Fix), Feedback-Runde 3.

---

## OFFEN-Register (an Sebastian) — mit Zwischen-Defaults, alles parametrierbar

| # | Punkt (Kap.) | Default bis zur Antwort |
|---|---|---|
| 1 | DSGVO Dokumente (3.3) | Modul bauen, Datei-Upload hinter Feature-Schalter |
| 2 | Immo-Provisionskette (1.5) | Berater-Anteil = % der Estera-Provision (analog VV) |
| 3 | VV-Hausanteil (6.2) | 100 % − Stufe; Factoring vor Aufteilung |
| 4 | Tippgeber-Topf (6.1) | von der Netto-Provision |
| 5 | Ratierlich + Einbehalt (6.1) | getrennt ausweisen, keine Verrechnung |
| 6 | Meeting-Modus (2.4) | ZUKUNFT — nicht gebaut |
| 7 | SLA-Zeiten (4.4) | 7 T / 48 h / 3 T / 14 T / 5 T / 21 T (in DB änderbar) |
| 8 | Kanal-Kosten für ROI (Kap. 6) | ROI entfällt, bis Kosten erfasst werden können |

## ZUKUNFT (bewusst nicht in dieser Runde)
Meeting-/Screenshare-Modus (2.4) · Backoffice-Rolle (2.5) · Kunden-Upload-Portal (3.1).

## Traceability — jede Anforderung → Phase

| Anforderung | Phase |
|---|---|
| 1.1 Volumen ≠ Umsatz | 9 |
| 1.2 Single Source of Truth + Konsistenz-Check | 9 |
| 1.3 Storno-Fix (bestätigter Bug) | 9 |
| 1.4 Funnel-Labels „je erreicht" vs. „aktuell" | 9 |
| 1.5 Immo-Provisionsfelder (variabel, GF-only Anteil) | 9 |
| 1.6 Plausibilitätswarnung Betrag > Rahmen | 9 |
| 2.1/2.2 Sichtbarkeitsmatrix Berater | 10 |
| 2.3 Leck 1 (eigene Quoten) + Leck 2 („Meine …") | 10 |
| 2.4 Meeting-Modus | ZUKUNFT |
| 2.5 Backoffice-Rolle | ZUKUNFT |
| 3.1 Dokumenten-Modul (nur Immo, vorhanden/fehlt, Fortschritt, kein Block) | 11 |
| 3.2 Feste Checkliste in 3 Gruppen nach Kundentyp | 11 |
| 3.3 DSGVO-Klärung vor Scharfschaltung | 11 (Schalter) |
| 3.4 Kontaktseite = Kundenakte + Finanzierungsstatus | 11 |
| 3.5 Activity-Timeline (auto + manuell) | 11 |
| 4.1 Heute-Ansicht | 12 |
| 4.2 Erwartete Provision (4 Werte, je Bereich + gesamt) | 12 |
| 4.3 To-Do-Block (Fälligkeit, optionale Zuordnung) | 12 |
| 4.4 SLA je Phase (konfigurierbar) | 12 |
| 4.5 Health-Ampel (Regeln grün/gelb/rot) | 12 |
| 4.6 Klickbare KPIs, Statusfarben, Quelle-Karte bei 0 | 10 + 12 |
| 4.7 Keine Blockaden/Eskalationen | 12 (beachtet) |
| 5.1 Auto-Aufgaben je Statuswechsel | 13 |
| 6 Forecast / Teamvergleich / Quellen / Einbehalte / Storno / Coaching | 14 |
| 6.1 Provisionsvorschau: Tippgeber- + Ratierlich-Zeile | 14 |
| 6.2 Summen-Skala (nur GF, je Bereich + gesamt) | 14 |
| 7 Offene Punkte | OFFEN-Register |
| 8 Leitbild (tägliche Nutzung) | 12 gesamt |
| Lukas A: Dashboards strikt je Bereich (auch Closing etc.) | 10 |
| Lukas B: Berater klickbar → Detailseite | 14 |
| Lukas C: Sparten-Sichtbarkeit je Berater (Immo/VV/beide, GF stellt ein, inkl. Berater-Anlage im CRM) | 10 |
