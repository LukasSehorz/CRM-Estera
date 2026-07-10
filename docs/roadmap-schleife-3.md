# Roadmap „Schleife 3" — Optimierungen (Lukas, mündlich/Screenshots)

> Grundlage: Optimierungsliste von Lukas (15 Punkte GF-Bereich + 3 Punkte
> Berater-Bereich) auf Basis der Live-App (estera-crm.netlify.app).
> Leitprinzip: **Erst Korrektheit & UX-Fixes, dann Design, zuletzt Marke.**
> Design-Phasen werden mit den Skills `/ui-ux-pro-max` + `/frontend-design`
> gebaut. Jede Anforderung hat eine Phase (Traceability unten).

## Phasenübersicht

| Phase | Inhalt | Punkte | Typ | Status |
|---|---|---|---|---|
| S3-1 | Sofort-Fixes Dashboard-Übersicht (Layout & Bugs) | GF 6, 7, 12, 15 · Ber. 3 | Fix | ✅ erledigt |
| S3-2 | Globaler kleiner Zurück-Pfeil (Topbar) | GF 11 · Ber. 1 | UX | ✅ erledigt |
| S3-3 | Klickbare KPIs + Monatsumsatz auf Berater-Performance | GF 3, 9 | UX | ✅ erledigt |
| S3-4 | Bereichs-Trennung Immo/VV in allen Listen & Übersichten | GF 10 | Feature | ✅ erledigt (Berater-Übersicht + Deal-Listen-Filter) |
| S3-5 | Filter & Sortierung in Listen (Deals, Einbehalt, Kontakte) | GF 8, 13, 14 | Feature | ✅ erledigt |
| S3-6 | Metrik „Umsatz (Monat)" → rollierende 30 Tage | GF 5 | Entscheidung | ✅ erledigt (Lukas: rollierend 30 T.) |
| S3-7 | Summen-Skala professionell darstellen | GF 4 | Design | ✅ erledigt (Netto-Hero + Kompositions-Leiste) |
| S3-8 | Login-Redesign („Millionen-Software"-Look) | GF 1 | Design | ✅ erledigt (Premium-Split-Screen) |
| S3-9 | Berater-Motivation: Ziel-Box + Streaks + weitere Ziele | Ber. 2 | Entsch.+Design+Migration | ✅ erledigt (Migration 0009, Ziel-Box, Streaks, GF-Editor) |
| S3-10 | Estera-Farben & Logo global | GF 2 | Design | ✅ erledigt (parallele Session: Navy/Gold-Tokens + Logo) |

Reihenfolge ist ein Vorschlag; Design-Phasen (S3-7/8) können jederzeit
vorgezogen werden. S3-10 kommt bewusst zuletzt (Wunsch: „wenn alles umgesetzt
ist, passen wir das Design auf die Unternehmensfarben an").

---

## S3-1 — Sofort-Fixes (erledigt)
- **GF 15a** Donut „Umsatz nach Quelle" lief aus der Karte → Flexbox-`min-w-0`
  ergänzt (`donut-breakdown.tsx`).
- **GF 15b** Leerraum neben „Funnel VV" → Übersicht-Grid neu: links (2/3)
  Umsatzentwicklung **+ Aktuelle Deals** gestapelt, rechts (1/3) Funnel(s) +
  Quelle. „Aktuelle Deals" rückt hoch und füllt den Platz (`dashboard/page.tsx`).
- **GF 6** „Aktuelle Deals" zeigen jetzt „angelegt TT.MM.JJJJ".
- **GF 7** „Offene Einbehalte (VV)" wird in der **Immobilien**-Ansicht durch
  „Ø Deal-Größe (offen)" ersetzt (bei Gesamt/VV bleibt der Einbehalt).
- **GF 12** VV-Deal-Formular: Factoring-Zusatz „(Provision × 90 %, 10 % Gebühr)"
  entfernt — nur noch „Mit Factoring".
- **Ber. 3 / GF** Grauer Auf/Ab-Scroll-Pfeil an den Dashboard-Tabs entfernt
  (`overflow-y-hidden` + Scrollbar ausgeblendet, `dashboard-tabs.tsx`).

## S3-2 — Globaler Zurück-Pfeil (GF 11 · Ber. 1)
- Optionale Prop `backHref` in `topbar.tsx`; kleiner `ArrowLeft`-Link links vom
  Titel. Verdrahtung auf allen Detail-/Unterseiten (Deal-Detail, Kontakt-Detail,
  Neu-Formulare, alle Listen-Unterseiten, Berater-Detail, Dashboard-Untertabs).

## S3-3 — Klickbare KPIs & Verlinkung (GF 3, 9)
- **GF 9** Die 3 KPI-Kacheln auf `/listen` (Kontakte 50, Offene 23, Verkauft 8)
  werden Links → gefilterte Listen. Analog Übersicht-KPIs → passende Liste.
- **GF 3** Monatsumsatz (z. B. 133.845 €) auf `/dashboard/performance` sichtbar
  machen (Kachel „Umsatz (Monat)" + Summenzeile über der Monats-Spalte).

## S3-4 — Bereichs-Trennung Immo/VV überall (GF 10)
- Wiederverwendbarer Switcher **[ Immobilien | Vermögensverwaltung | Gesamt ]**
  in Listen/Übersichten (analog Dashboard-`BereichSwitcher`).
- **Berater-Übersicht** (`/listen/berater`) strikt getrennt: Immo-Ergebnisse und
  VV-Ergebnisse nie in einer Zahl mischen.
- Grundsatz Kunde: „Immobilien und VV sind zwei Welten" → überall getrennte
  Sicht ermöglichen.

## S3-5 — Filter & Sortierung in Listen (GF 8, 13, 14)
- Wiederverwendbare Sortier-/Filter-Tabelle (aus `contacts-table.tsx`
  generalisieren; die hat bereits Suche + Select-Filter + klickbare Sortierung).
- **GF 8** Offene Deals: Pipeline-Summe oben (Gesamt + Immo + VV), **Berater-
  Filter** (Mehrfachauswahl statt Suchleiste), Sortierung nach Betrag / Datum /
  Phase.
- **GF 13** Provision & Einbehalt (VV), alle drei Listen: Sortierung nach
  Betrag/Datum + Phasen-Filter.
- **GF 14** Kontakte: Filter/Sortierung erweitern wo sinnvoll (Basis existiert
  schon: Suche, Status-, Interesse-Filter, Spalten-Sortierung).

## S3-6 — Metrik „Umsatz (Monat)" (GF 5) · ENTSCHEIDUNG
Ist-Zustand: **Kalendermonat** (1. bis heute) vs. **kompletter Vormonat** →
am Monatsanfang systematisch verzerrt (heute 9 Tage vs. 30 Tage → −23,5 %).
Optionen (siehe Entscheidungs-Register D1).

## S3-7 — Summen-Skala professionell (GF 4) · DESIGN
Die 3 Blöcke „Estera-Umsatz (Summen-Skala)" (aktuell schlichte `dl`-Liste) als
hochwertige, leicht lesbare Visualisierung (z. B. Wasserfall/gestapelte Balken:
Brutto → −Einbehalt → −Tippgeber → −Berater = Netto). Skills nutzen.

## S3-8 — Login-Redesign (GF 1) · DESIGN
Anmelde-Seite auf „professionelle Software, die schon Millionen verdient" heben.
Skills nutzen. Marke/Farben kommen final in S3-10.

## S3-9 — Berater-Motivation (Ber. 2) · UMGESETZT
Entscheidungen Lukas (09.07.): Ziele legt die GF gemeinsam mit dem Berater
fest (Pflege in Team-Verwaltung, nur GF schreibt) · Dummy-Ziele in tsd. €
(Seed: 10.000 € Immo / 5.000 € VV je aktivem Berater) · Streaks zählen ab
Firmeneintritt (profiles.created_at).
- **Migration 0009:** Tabelle `berater_monatsziele` (RLS: lesen eigenes/GF,
  schreiben nur GF) + Dummy-Seed.
- **Ziel-Box** (`ziel-block.tsx`, nur Rolle berater, direkt nach Begrüßung):
  je Sparte eine Karte (nie zusammengefasst) — Count-up der eigenen Provision,
  animierter Fortschrittsbalken mit Ampel (<40 % rot „Jetzt Gas geben",
  <80 % gelb „Auf dem Weg", ≥80 % grün „Fast am Ziel", ≥100 % Gold-Verlauf
  „Ziel erreicht"), Pace („auf Kurs" / „X € hinter dem Zeitplan"), Rest-Tage.
- **Streaks:** Monats-Streak je Sparte (Ziel erreicht in Folge, ab Eintritt,
  geprüft gegen aktuelles Ziel — keine Ziel-Historie) + Aktivitäts-Streak in
  Werktagen (Timeline/Aufgaben/Deals/Phasenwechsel; Wochenende neutral).
- **Team-Verwaltung:** Spalten „Monatsziel Immo/VV (€)" je Berater, nur für
  freigeschaltete Sparten, kombinierter Speichern-Button.
- **ZUKUNFT (Vorschläge, nicht gebaut):** Wochen-Mikroziele (X neue Leads,
  X Termine), Team-Bestenliste (opt-in), Ziel-Historie je Monat für exakte
  Streaks, kleine Konfetti-/Sound-Belohnung bei 100 %.

## S3-10 — Estera-Farben & Logo (GF 2) · DESIGN (zuletzt)
Markenfarben + echtes Logo global (Login, Sidebar, Favicon). Braucht Assets (D3).

---

## Entscheidungs-Register (brauche ich von Lukas)

| # | Phase | Frage | Vorschlag / Default |
|---|---|---|---|
| D1 | S3-6 | Wie soll „Umsatz (Monat)" rechnen/vergleichen? | **Monat bis heute (MTD) vs. gleicher Zeitraum im Vormonat** (fairer Vergleich, gleiche Tageszahl). Alternative: rollierende 30 Tage vs. Vor-30-Tage. |
| D2 | S3-9 | Woher kommen die Monats-Umsatzziele? Wer setzt sie? Streak-Regel? | GF setzt Ziel je Berater (evtl. je Sparte) in Team-Verwaltung; Streak = „Monatsziel erreicht" in Folge. Werte/Regeln von Lukas. |
| D3 | S3-10 | Logo-Datei (SVG/PNG) + exakte Estera-Hex-Farben? | Aktuell nur Text-„E" + Lila `#6d5ef8`. Assets fehlen im Repo. |

## Traceability — jede Anforderung → Phase

| Anforderung (Lukas) | Phase |
|---|---|
| GF 1 Login professioneller | S3-8 |
| GF 2 Estera-Farben + Logo | S3-10 |
| GF 3 Monatsumsatz auf Performance sichtbar | S3-3 |
| GF 4 Summen-Skala schöner | S3-7 |
| GF 5 Umsatz-Metrik rollierend? | S3-6 |
| GF 6 Datum bei „Aktuelle Deals" | S3-1 ✅ |
| GF 7 Offene Einbehalte bei Immo tauschen | S3-1 ✅ |
| GF 8 Offene Deals: Summe + Bereich + Berater-Filter + Sortierung | S3-4 + S3-5 |
| GF 9 Klickbare KPIs (Listen + Übersicht) | S3-3 |
| GF 10 Bereichs-Trennung Immo/VV überall | S3-4 |
| GF 11 Zurück-Pfeil überall | S3-2 |
| GF 12 VV-Factoring-Text kürzen | S3-1 ✅ |
| GF 13 Provision & Einbehalt sortieren/filtern | S3-5 |
| GF 14 Kontakte filtern/sortieren | S3-5 |
| GF 15 Layout-Bugs (Donut-Overflow, Funnel-Leerraum) | S3-1 ✅ |
| Ber. 1 alle GF-Punkte sinngemäß | über alle Phasen |
| Ber. 2 Ziel-Box + Streaks + weitere Ziele | S3-9 |
| Ber. 3 grauen Scroll-Pfeil raus (auch GF) | S3-1 ✅ |
