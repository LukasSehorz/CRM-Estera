# Offene Punkte-Register (V4.1 Kap. 16)

Stand: Schleife 4. Jeder offene Punkt blockiert nur sein eigenes Feature, nicht
den Kern. Wo eine Antwort aussteht, ist ein **Default aktiv** (im Code
markiert), der sich mit einer einzigen Stelle umstellen lässt.

## Bereits geklärt & umgesetzt

| Thema | Entscheidung | Umgesetzt |
|---|---|---|
| Factoring + Einbehalt | Einbehalt (85/15) nur mit Factoring; ohne Factoring voll sofort | ✅ `provision.ts` |
| Ratierlich | kein Einbehalt/Factoring, Gesamtprov. ÷ 60 über 5 Jahre | ✅ |
| Tippgeber | Anteil geht vom Berater-Anteil ab (Umsatz vs. „Gewinn") | ✅ |
| Overhead | Differenz der Anbindungen (Beispiel 20 %/2 % war nur illustrativ) | ✅ `dealOverheadFuerUpline` |
| Qualifizierter Lead | Netto ≥ 2.500 € und EK ≥ 10.000 € (konfigurierbar) | ✅ `enums.ts` |
| Stufe (Provisionsanteil) | frei setzbar, GF-only, Presets als Schnellauswahl | ✅ |
| Karriere-Aufstieg | GF setzt Stufe manuell; Leiter ist reine Fortschrittsanzeige | ✅ `karriere.ts` |
| Umsatz-Buchung | Immo ab Notartermin, VV bei Policierung; 30/60/90 = Forecast | ✅ |
| Finanzierung/Dashboard | Einschätzung 3 Stati, Rahmen gestrichen, Eingeschätzte nur Immo | ✅ |
| Dokumentenportal | eigener Bereich, Immo/VV getrennt, Mehrfach-Upload/Nachreichen/ZIP | ✅ |
| White-Label | eigene Instanz + Branding-Flag | ✅ (Konfig + Doku) |

## Noch zu klären (Default aktiv)

| # | Thema | Frage | Aktueller Default | Umstellen bei |
|---|---|---|---|---|
| 1 | **DSGVO Dokumente** | Speicherort, Löschkonzept, Einwilligung | privater Bucket + signierte URLs (60 s); Upload-Schalter `DOKUMENT_UPLOAD_AKTIV` | `enums.ts` / Storage-Policies |
| 2 | **Immo-Provisionskette** | Berater-Anteil vom Kaufpreis-Topf oder von der Estera-Provision? | `anteil_von_provision` | `IMMO_PROVISION_MODUS` in `provision.ts` |
| 3 | **Overhead-Detail** | Basis = Provision vor dem Vertriebler-Anteil des Partners? (Annahme 8.2) | ja (aus Hausanteil, Partner nichts abgezogen) | `dealOverheadFuerUpline` |
| 4 | **Tippgeber-Topf** | Aus welchem Topf wird der Tippgeber-Satz gerechnet? | vom Berater-Anteil (Vorgabe Lukas) | `dealTippgeberAnteil` |
| 5 | **Meeting-/Präsentationsmodus** | Welche Kennzahlen genau verbergen? | ZUKUNFT — nicht gebaut | Kap. 2.4 |
| 6 | **SLA-Feinschliff** | „so schnell wie möglich" + Vorschlags-Zeiten bestätigen | Immo 7/2/3/5/14/21 Tage, VV 7/7/7/14 | `pipeline_stages.sla_tage` (Migration 0008) |
| 7 | **ROI je Kanal** | Kosten je Leadquelle für ROI | nicht erfasst — braucht Kosten-Eingabe | Kap. 6 (neue Kostenerfassung) |
| 8 | **„auf Objekt belegt"** | Verhalten, wenn Budget belegt (nur Info oder Blockade?) | reine Info-Markierung, keine Blockade | Kap. 15.2 |

## Bewusst NICHT gebaut (Kap. 12 / 13 / Vorgabe Lukas)

- **Leaderboard (9.3)** — auf ausdrücklichen Wunsch vorerst weggelassen.
- Präsentationsmodus (2.4), Retainer-Modell Immo (8.4), KI-Empfehlungen &
  Sprachassistent & Push (Kap. 13) — bewusst später.
- Interner Chat/Wiki/E-Mail/Kalender, 500 Filter, harte Pflicht-Blockaden.
