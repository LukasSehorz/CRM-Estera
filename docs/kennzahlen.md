# Kennzahlen — Definitionen & Herleitung (V4.1)

Damit alle Zahlen im CRM erklärbar sind (Kap. 1.1, 15.2 „Blick nach vorn").
Diese Datei ist die verbindliche Referenz für die Bedeutung jeder Zahl.

## 1. Umsatz vs. Volumen (Kap. 1.1 / 1.2)

Zwei streng getrennte Größen — nie vermischt:

| Kennzahl | Definition | Verwendung |
|---|---|---|
| **Transaktionsvolumen** | Kaufpreis (Immobilien) bzw. BWS (VV) | Volumen-Ansichten, Pipeline-Größe, Ø Deal-Größe |
| **Umsatz / Provision** | realisierte Estera-Provision | Umsatz-KPIs, Forecast, Provisionsanzeige |

**Kanonische Umsatz-Definition:** realisierte **Estera-Provision** aus
realisierten Deals.
- **Rolle GF** sieht den **Estera-Umsatz** (Provision, die bei Estera ankommt).
- **Rolle Berater** sieht die **eigene Provision** (Basis × Stufe) — nie den
  Hausanteil (Kap. 2.2).

Code: `dealVolumen` / `dealEsteraUmsatz` / `dealBeraterProvision` in
`src/lib/provision.ts`, rollenbewusst gebündelt in `a.umsatzOf` (`analytics.ts`).

## 2. Wann Umsatz zählt (Kap. 1.1, GEKLÄRT)

- **Immobilien:** realisiert zum **Notartermin** — nicht bei Reservierung/
  Kaufvertrag. Buchungsdatum = erster Eintritt in die Phase „Notartermin"
  (aus `deal_stage_history`).
- **VV:** realisiert bei **Policierung** (= Gewinn-Phase erreicht).
- Storno/Verlust ist nie realisiert. Rückstufung heilt sich selbst, weil der
  aktuelle Status zählt.

Code: `a.istRealisiert` / `a.realisiertAm` in `analytics.ts`.

## 3. VV-Rechenkette (Kap. 7.1) — drei Fälle

Basis immer: `BWS = Sparbeitrag × 12 × Jahre` (Jahre ≤ 40),
`Grundprovision = BWS × 7,8 %`.

| Fall | Kette | Einbehalt |
|---|---|---|
| **1 · Factoring** (Normalfall) | Grundprov. × 90 % × Stufe → 85 % sofort | ja — 15 % nach 12 Monaten |
| **2 · ohne Factoring** | Grundprov. × 100 % × Stufe → voll sofort | nein |
| **3 · ratierlich** | Grundprov. × 100 % × Stufe → ÷ 60, monatlich über 5 Jahre | nein |

**Der Einbehalt hängt am Factoring** — nur bei Fall 1. Der **Tippgeber-Anteil**
geht vom **Berater-Anteil** ab (Umsatz = Stufe × Basis, „Gewinn" = Umsatz −
Tippgeber-Anteil), nicht vom Hausanteil.

Code: `computeProvision` in `src/lib/provision.ts` (Selbsttest im Datei-Kopf).

## 4. Stornoquote (Kap. 1.4)

`Stornoquote = verlorene ÷ (gewonnen + verlorene)` — gleicher Nenner-Bezug wie
die Gewonnen-Zählung. Ein stornierter Deal zählt in KEINEM Gewonnen-Zähler.

## 5. Forecast / „Blick nach vorn" (Kap. 6 / 15.2)

**Gewichtete Provision** der offenen Pipeline über 30/60/90 Tage — **kein**
realisierter Umsatz, sondern Erwartung.

Herleitung: je offenem Deal `erwartete eigene/Estera-Provision ×
Phasen-Wahrscheinlichkeit`. Ohne geplantes Abschlussdatum nähern wir den
Zeithorizont über die Phasen-Wahrscheinlichkeit an (kumulativ):
- **≥ 80 %** → zählt in **30 Tage** (späte Phasen schließen typisch bald),
- **≥ 40 %** → zählt in **60 Tage**,
- Rest → **90 Tage**.

Code: `forecastGewichtet` in `analytics.ts`.

## 6. Deal-Time & Closing Rate

- **Deal-Time:** Ø Tage vom ersten Termin (Immo „T1 Konzept", VV „Termin
  vereinbart") bis `closed_at`, über gewonnene Deals.
- **Closing Rate:** gewonnen ÷ (Deals, die je den ersten Termin erreichten).

## 7. Qualifizierter Lead (Kap. 15.2)

Automatisch aus den Kontaktdaten: `Nettoeinkommen ≥ 2.500 € UND Eigenkapital ≥
10.000 €` (konfigurierbar in `src/config/enums.ts`). „Heiß" ist nur ein
optionales Zusatz-Signal (qualifiziert + Einschätzung „eingeschätzt" +
kürzliche Aktivität), kein konkurrierender Status.

## 8. Konsistenz-Check

`scripts/consistency-check.mjs` verprobt die Invarianten (u. a. „Summe
gewonnener Deals je Bereich = KPI-Wert", Rechenkette Fälle 1–3).
