# Umsetzungsplan — Anforderungsdokument V4.1 (Schleife 4)

Grundlage: „Estera-CRM-Anforderungsdokument_1.pdf" (Stand 11.07.2026, V4.1)
plus mündliche Präzisierungen von Lukas (12.07.2026):

- **Kein Leaderboard** (Kap. 9.3) — wird vorerst nicht gebaut.
- **Overhead ist NICHT fix 20 %/2 %** — das waren Beispiele. Overhead =
  **Differenz der Anbindungen**: Jeder Partner/Berater hat eine Anbindung
  (Immo-% und VV-%). Schließt ein untergeordneter Partner ab, erhält der
  übergeordnete die Differenz (Fred: Immo 7 %/VV 50 %, Partner: 5 %/40 %
  → Fred bekommt 2 % Immo bzw. 10 % VV Overhead auf derselben Basis).
- **Tippgeber-Satz geht vom Berater-Anteil ab**: Berater 40 % VV, Tippgeber
  10 % → Umsatz des Beraters = 40 % × Basis, „Gewinn" = 30 % × Basis.
  Der Estera-/Hausanteil bleibt davon unberührt.
- Jeder Berater bekommt eine **eigene, einfachere Partner-Sicht** („Meine
  Partner" + „Meine Tippgeber"): wer ist mir zugeordnet, welche Anbindung,
  Umsatz diesen Monat, mein Overhead daraus.

## Status je Kapitel

| Kap. | Punkt | Status |
|---|---|---|
| 1.1 | Kanonischer Umsatz = realisierte Estera-Provision (Estera-Netto); Zeitbezug rollierend 30 T | ✅ weitgehend (Schleife 3) → Doku ergänzen |
| 1.1 | **Umsatz-Buchung: Immo zum NOTARTERMIN, VV bei Policierung** | 🔨 A |
| 1.2 | Volumen ≠ Umsatz | ✅ |
| 1.3 | Single Source + Konsistenz-Check | ✅ (Script erweitern in H) |
| 1.4 | Stornos | ✅ |
| 1.5 | Stufen-Spalte „Stufe VV" labeln; **Immo-Default pro Berater** (vorbefüllt, pro Deal überschreibbar) | 🔨 A/E |
| 1.6 | Plausibilität | ✅ → ersetzt durch 15.2-Modell (B) |
| 2.1–2.3 | RLS eigene Daten | ✅ |
| 2.4 | Präsentationsmodus | ⏭ ZUKUNFT |
| 2.5 | **Backoffice-Rolle** | 🔨 A (DB) + F (UI) |
| 3.1 | **Echter Datei-Upload** mit Status-Ampel | 🔨 C |
| 3.2 | Feste Dokumentenliste je Kundentyp | ✅ |
| 3.3 | DSGVO | ⏭ OFFEN (privater Bucket + signierte URLs als sichere Basis) |
| 3.4 | Timeline ✅ · **„Nächster Schritt" (Text+Fälligkeit) je Deal** | 🔨 A |
| 4.1–4.5 | Heute / Provision / To-Dos / SLA / Health | ✅ |
| 4.6 | Klickbare KPIs ✅ · **leere Zustände → Handlungs-Karte**, **Berater-Dashboard entschlacken** | 🔨 F |
| 4.7 | Keine Blockaden | ✅ (nichts bauen) |
| 5 | Auto-Aufgaben ✅ · **„fehlende Unterlagen → Aufgabe"** | 🔨 F |
| 6 | GF-Dashboard | ✅ (ROI je Kanal bleibt OFFEN — braucht Kostenerfassung) |
| 7.1 | **Drei Fälle: Factoring (85/15-Einbehalt NUR mit Factoring!), ohne Factoring (voll sofort), ratierlich (÷60)** — aktuell invertiert modelliert | 🔨 A (Kern!) |
| 7.2 | Stufe frei, GF-only | ✅ |
| 7.3 | **Karriereleiter als Fortschrittsanzeige** | 🔨 D |
| 7.4 | **Block „Mein Gehalt"** (sofort/Einbehalt-Kalender/ratierlich/Overhead) | 🔨 D |
| 7.5 | **Berater-Vorschau reduziert, Jahre ≤ 40, Kurzdoku, kein Nettopolice-Feld** | 🔨 A |
| 8.1 | **„Meine Partner"-Sicht je Berater** | 🔨 E |
| 8.2 | Overhead = Anbindungs-Differenz (s. o.) | 🔨 E |
| 8.3 | **„Meine Tippgeber"-Block** | 🔨 E |
| 8.4 | Retainer | ⏭ ZUKUNFT (Datenmodell kompatibel: Anteil pro Deal bleibt) |
| 9.1 | Handlungsaufforderungen | ✅ (Ziel-Box) + F (Ø €/Tag) |
| 9.2 | **Erfolgs-Moment beim Abschluss** | 🔨 F |
| 9.3 | Leaderboard | ⛔ ausdrücklich NICHT (Lukas) |
| 9.4 | Streaks | ⏭ später (Ansatz vorhanden) |
| 9.5 | **Quick Actions (anrufen/WhatsApp/Mail)** | 🔨 F |
| 10 | White-Label = eigene Instanz | 🔨 G (Branding-/Flag-Konfiguration + Doku, kein Mandanten-Umbau) |
| 11 | Skalierung: **suchbare Tabellen**, Hierarchie im Rollenmodell | 🔨 E/G |
| 12 | Bewusst nicht bauen | ✅ (nichts tun) |
| 13 | Zukunft | ⏭ |
| 14 | **Dokumentenportal (Sidebar-Hauptbereich): Vorlagen / Kundenunterlagen / Intern, Multi-Upload, Nachreichen, Vorschau, ZIP** | 🔨 C |
| 15.1 | Neue-Deal-Maske bereinigen · To-Dos präsenter ✅ · Pipeline-Volumen bedingt · Dokumente sichtbarer · Mehrfach-Upload | 🔨 A/C/F |
| 15.1 | „Estera Intelligenz"-Kugel benennen · Platzhalter-Satz raus · Farbschema | 🔨 F (suchen & fixen, soweit vorhanden) |
| 15.2 | **Finanzierungseinschätzung NEU (3 Stati + „finanzierbar bis" + „auf Objekt belegt")**, Rahmen streichen, **Qualifiziert automatisch (≥2.500 € netto & ≥10.000 € EK)**, Heiß = Zusatzsignal, Eingeschätzte nur Immo | 🔨 B |
| 15.2 | Monatsziel: Berater setzt selbst, GF überschreibt/sperrt | 🔨 F |
| 15.2 | „Blick nach vorn" dokumentieren | 🔨 G |
| 16 | Offene Punkte-Register aktualisieren | 🔨 G |

## Arbeitspakete (Reihenfolge)

**A — Datenlogik & Provisions-Kern** (Migrationen 0010/0011, provision.ts,
analytics.ts, Deal-Maske): vv_zahlart (factoring/ohne_factoring/ratierlich),
Einbehalt 15 % NUR bei Factoring und auf den BERATER-Anteil, Tippgeber vom
Berater-Anteil, Immo-Umsatz ab Notartermin (realisiertAm aus Historie),
next_step-Felder, profiles: immo_anteil_default/parent_berater_id/
karriere_fenster_start/ziel_gesperrt, Rolle backoffice, RLS Downline-Read,
Berater-Maske ohne interne Sätze, Jahre ≤ 40, Nettopolice raus, „Stufe VV".

**B — Kontakt-Vereinfachung**: einschaetzung (3 Stati) + belegt_deal_id,
Rahmen komplett raus (Form/Listen/Filter), Qualifiziert-Automatik + Heiß-
Signal neu, dashboard/eingeschaetzt nur Immobilien.

**C — Dokumente**: Supabase Storage (kundendokumente/vorlagen/intern,
privat), contact_files + portal_files (RLS), Upload in der Akte je
Dokumenttyp (mehrfach, nachreichbar, Vorschau, Drag&Drop, ZIP), Status-
Automatik „vorhanden", Sidebar-Hauptbereich „Dokumente" mit 3 Tabs,
VV-Kontakte: nur Ausweis.

**D — Karriere & Gehalt**: config/karriere.ts (5 Ränge), KarriereBlock
(Rang, BWS-Zähler im Fenster, Ladebalken, Resttage), GehaltBlock (sofort /
Einbehalt-Kalender / ratierlich / Overhead) — Berater-Dashboard + GF-Drilldown.

**E — Partner & Tippgeber**: Team-Verwaltung um Anbindung (Immo-%,
Übergeordneter, Rolle) erweitern; Seite „Partner" (Downline-Tabelle +
Meine Tippgeber); Overhead-Berechnung (Differenzmodell); Suchfelder.

**F — UX/Gamification/Bereinigung**: Won-Moment, Quick Actions, leere
Zustände, Berater-Dashboard entschlacken (3 KPIs, ohne Quelle-Donut),
Pipeline-KPI bedingt, fehlende Unterlagen → Aufgabe, Monatsziel selbst,
Platzhalter/Intelligenz-Kugel, Backoffice-UI.

**G — White-Label & Doku**: config/branding.ts + docs/white-label.md,
docs/kennzahlen.md (Umsatz-Definition, Blick-nach-vorn-Herleitung),
Offene-Punkte-Register.

**H — Qualität & Deploy**: Konsistenz-Check v2 (Rechenkette Fälle 1–3),
Typecheck/Lint, E2E-Kernpfade, Seeds aktualisiert, Netlify-Deploy, Live-Smoke.

## Bewusst NICHT in dieser Schleife
Leaderboard (Lukas) · Präsentationsmodus (2.4) · Retainer (8.4) · Kap. 13 ·
ROI je Kanal (braucht Kosten je Kanal — offener Punkt Sebastian) ·
echtes Mandanten-System (10: als eigene Instanz/Deployment gelöst, Doku in G).
