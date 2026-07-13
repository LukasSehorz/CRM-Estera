# Analyseprotokoll — Soll/Ist gegen die 3 Anforderungsdokumente

Stand: 13.07.2026 · Methode: 5 read-only Code-Analysen + Live-Screenshots (GF & Berater)
Grundlage: Schleife 1 (26.06.), Schleife 2 (06.07.), **V4.1 (11.07., maßgeblich)**
**Es wurde nichts geändert** — dies ist nur der Befund, damit du entscheiden kannst, was noch rein soll.

---

## Gesamtbild

Das CRM setzt V4.1 **weitgehend vollständig** um. Der Korrektheits-Kern ist rechnerisch
exakt verifiziert:
- VV-Rechenkette 3 Fälle, **Einbehalt nur mit Factoring** (Beispiel BWS 48.000 €/Stufe 40 % → sofort 1.145,66 € / Einbehalt 202,18 € ✓)
- **Overhead = Anbindungs-Differenz** (Fred 7 %/50 % vs. Partner 5 %/40 % → 2 % Immo / 10 % VV ✓)
- **Tippgeber geht vom Berater-Anteil ab** ✓ · Karriere-Schwellen/Fenster exakt ✓
- **RLS DB-hart** (Berater nur eigene Daten, GF alles) · Storno-Fix ✓ · Umsatz-Buchung Immo ab Notartermin ✓
- Die 3 mündlichen Vorgaben erfüllt: Leaderboard fehlt korrekt, Overhead = Differenz (nicht fix), Tippgeber vom Berater-Anteil
- Die 3 heutigen Fixes live bestätigt: pinker Header-Text weg · Aufgaben-Gruppen klappbar (Erledigt zu) · Dokumente-Ordner je Kunde

**Nichts ist kaputt/kritisch.** Die offenen Punkte unten sind Abwägungen, keine Blocker.

---

## A · Sicherheitsrelevant (empfohlen, bevor Backoffice/Partner produktiv genutzt werden)

| # | Befund | Auswirkung | Empfehlung |
|---|--------|-----------|-----------|
| **A1** | Backoffice erreicht die Provisions-Unterseiten per URL — nur `/dashboard` leitet um, **`/dashboard/performance`, `/pipeline`, `/eingeschaetzt` haben keinen Rollen-Guard** | Ein Backoffice-Nutzer sähe dort firmenweite Berater-Provisionen/Funnel/Pipeline/eingeschätzte Kunden — widerspricht „Backoffice: keine Provisionsrechte" (V4.1 2.5) | Serverseitigen Redirect für `rolle==='backoffice'` auf diese Unterseiten ergänzen. **Nicht akut**, da Backoffice laut Schleife 2 noch „ZUKUNFT" ist und aktuell keiner die Rolle hat. |
| **A2** | Downline-Deals fließen anonym in die „eigenen" Berater-Kennzahlen (Provision/Pipeline/Funnel), weil das Berater-Dashboard nicht auf die eigene `berater_id` scoped. Zugleich rendert die **„Meine Partner"-Tabelle nie** (Downline-Profile für Berater nicht lesbar) | Falsche „eigene" Zahlen beim Upline-Berater; „Meine Partner" (8.1) faktisch inaktiv | (1) Dashboard-Aggregate auf eigene `berater_id` scopen; (2) Downline-Profil-Lesepolicy ergänzen. **Nur relevant, sobald Partner/Downline zugewiesen werden** (aktuell offenbar keine — nur „Meine Tippgeber" ist sichtbar, das funktioniert). |

---

## B · Funktionale Abweichungen von V4.1 (entscheiden: nachziehen oder bewusst so lassen)

| # | Anforderung (V4.1) | Ist-Zustand | Deine Entscheidung |
|---|--------------------|-------------|--------------------|
| **B1** | 14.2: VV-Kontakte **„standardmäßig nur Ausweis"** | VV zeigt **gar keine** Dokumente (folgt Schleife 2 „VV braucht keine Dokumente") | Reicht „keine" für VV, oder Ausweis-Feld nachziehen? |
| **B2** | 4.2: Erwartete Provision **je Bereich getrennt + Gesamt gleichzeitig** | Forecast-Karte zeigt nur die Summe; Immo/VV-Trennung nur über den Bereichs-Umschalter, nicht simultan (getrennter Block existiert als toter Code) | Getrennte Immo/VV-Zeilen in die Karte holen? |
| **B3** | 6: Teamvergleich mit **Transaktions-/Dealvolumen (nicht nur Ø) + Konversion** je Berater | Tabelle hat Umsatz, Ø Deal-Größe, Deal-Time, Closing, Storno — **kein Gesamt-Volumen, keine Konversion** (Konversion nur im Drilldown) | Volumen- + Konversions-Spalte ergänzen? |
| **B4** | 4.1: „Heute"-Liste inkl. **fehlende Dokumente** | Fehlende Dokumente nur in der Board-Ampel, nicht in der Tagesliste | In die Heute-Liste aufnehmen? |
| **B5** | 4.6: **Berater-Dashboard entschlacken** (volle Analytik nur GF) | Berater sieht dieselbe volle Analytik (Funnels, Umsatz nach Quelle) wie GF — kein Sicherheitsproblem (eigene Daten), aber gegen die „schlank"-Vorgabe | Bewusst so (mehr Infos) oder für Berater ausdünnen? |
| **B6** | 10: White-Label blendet interne Werte aus | `zeigeInterneWerte()` ist definiert, aber **nirgends angewandt** — der Schalter blendet aktuell nichts aus; Trennung ruht auf getrennter DB/Instanz (in `white-label.md` ehrlich dokumentiert) | Erst nötig beim Bau einer echten externen Instanz |
| **B7** | 11: **suchbare/paginierte** Team-/Performance-Tabellen | Nur die Kontaktliste ist suchbar; Team-Verwaltung + Berater-Performance-Tabelle rendern alle Zeilen ungefiltert | Bei aktuell wenigen Beratern unkritisch — jetzt oder später? |

---

## C · Kleinere Bugs / Härtung

- **C1** Deal-Karten-Dokumenten-Badge kann nach Löschen der letzten Datei „überzählen" (der `vorhanden`-Haken wird beim Löschen nicht zurückgesetzt) → Kontakt- vs. Deal-Badge können abweichen.
- **C2** Der DSGVO-Schalter `DOKUMENT_UPLOAD_AKTIV` greift nicht für die alte „ContactDocuments"-Uploadfläche (nur für die Checkliste).
- **C3** Der Immo-Berater-Anteil „1–10 %" ist nur im Formular erzwungen; der DB-CHECK erlaubt 0–100 % (über die Server-Action wäre ein Wert außerhalb speicherbar).
- **C4** Der Konsistenz-Check verprobt die 3-Fälle-Rechenkette nur als Negativ-Sanity (`gewinn < 0`), nicht als volle Soll-Ist-Nachrechnung (systembedingt, da Provisionen app-seitig gerechnet werden).

---

## D · Bewusst offen / Zukunft (auf Sebastian warten — kein Handlungsbedarf)

- **DSGVO** für Kundendokumente (Speicherort/Löschkonzept/Einwilligung) — vor Go-Live des Uploads
- **Immo-Provisionskette**: Berater-Anteil vom Kaufpreis-Topf oder von der Estera-Provision? (Default aktiv: `anteil_von_provision`)
- **ROI je Leadquelle** — braucht Kostenerfassung; aktuell nur „Umsatz nach Quelle"
- **Meeting-/Präsentationsmodus** (2.4) — bewusst nicht gebaut
- **Retainer-Modell Immobilien** (8.4) — Zukunft; Datenmodell vorbereitet
- **Kunden-Upload-Portal per Link/Token** (3.1) — bewusst nicht gebaut
- **Tippgeber-Topf / Overhead-Basis-Detail** — Annahmen aktiv, von Sebastian zu bestätigen
- **SLA-Feinschliff** — Default-Zeiten aktiv (Immo 7/2/3/5/14/21 Tage), von Sebastian zu bestätigen

---

## E · Kosmetik (funktional harmlos)

- `deal_typ`/„Nettopolice": DB-Spalte + TS-Typ + VV-Seiten-Untertitel „Nettopolicen" als inerte Reste (Feld ist aus UI + Schreibpfad raus).
- `FINANZIERUNGSRAHMEN`-Enums als tote Definitionen (bewusst für DB-Typ-Kompatibilität belassen).
- Eingeschätzte-Kunden-Ampel filtert „ausstehend" bewusst aus (zeigt nur eingeschätzt/nicht finanzierbar).

---

## Empfehlung zur Priorisierung

1. **Vor produktiver Backoffice-/Partner-Nutzung:** A1 + A2.
2. **Wenn V4.1 buchstabengetreu:** B1–B4 (kleine, klar umrissene Ergänzungen).
3. **B5–B7, C, E:** Abwägung/optional — kein funktionaler Mangel.
4. **D:** liegt bei Sebastian, nicht bei der Entwicklung.
