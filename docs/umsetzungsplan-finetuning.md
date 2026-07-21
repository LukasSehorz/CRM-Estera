# Umsetzungsplan — CRM Fine-Tuning (Sebastian Meilbeck, 19.07.2026)

Quelle: `Estera Anforderungen/CRM_Finetuning.pdf`. 12 Änderungspunkte, hier
verankert im Code (Datei:Zeile aus der Code-Analyse) und in Umsetzungs-Phasen
gruppiert. Reihenfolge = Vorschlag; jede Phase endet mit Zusammenfassung +
Freigabe (Projektregel 5, phasenweise).

Legende Status: ✅ bereits umgesetzt (verifizieren) · 🟢 klar, umsetzbar ·
🟡 klar mit Interpretation · 🔴 Kunden-Rückfrage offen · ⚪ kundenseitig offen.

---

## Phase F1 — Frontend-Quickwins (keine Migration, sofort sichtbar)

### P8 · „12/14/25" + „12 %" aus dem Provisionssatz-Feld 🟢
- Es gibt keinen echten Default. Der „12 %"-Eindruck kommt aus **Preset-Buttons**
  (`PROVISIONSSATZ_PRESETS = [12,14,25]`) und dem Placeholder „z. B. 12".
- **Tun:** Preset-Button-Block in `deals/deal-form.tsx:446-462` entfernen,
  Placeholder `deal-form.tsx:444` neutralisieren („z. B. 12" → leer/„Satz in %"),
  Import `deal-form.tsx:14` + Konstante `config/enums.ts:100-102` aufräumen
  (nur noch dort referenziert). Feld selbst (nur GF, nur Immobilien) bleibt.

### P11 · Tippgeber-Hinweis „geht von deinem Anteil ab…" 🟢
- Einzige Fundstelle, für GF **und** Berater sichtbar.
- **Tun:** `<p>`-Element in `deals/deal-form.tsx:650-652` löschen.

### P7 · Karriere BWS-Satz-Tabelle 🟢
- Leiter ist Single Source of Truth in `config/karriere.ts:17-23`. Die **Schwellen
  (250k/750k/1M/2M) stimmen bereits** — nur die Prozente ändern sich:

  | Schwelle | alt | neu |
  |---|---|---|
  | Einstieg | 10 % | 10 % (bleibt) |
  | ab 250.000 | 20 % | **15 %** |
  | ab 750.000 | 40 % | **25 %** |
  | ab 1.000.000 | 50 % | **40 %** |
  | ab 2.000.000 | 60 % | **55 %** |

- **Tun:** 4 × `anteil` in `karriere.ts:19-22` ändern.
- **Nebeneffekte (ich behandle sie mit):**
  1. Auszahlung nutzt den pro Berater gespeicherten `vertriebler_stufe`-Wert,
     nicht die Leiter → Demo-Werte auf die neue Skala {10,15,25,40,55} angleichen.
     (Produktiv: GF setzt Werte ohnehin manuell — Hinweis für die Übergabe.)
  2. Rang-Etiketten verschieben sich automatisch (`rangFuerStufe`) → nach dem
     Angleichen der Demo-Werte konsistent.

### P12 · Sub-Berater: Immo-Anteil 1–7 % statt bis 10 % 🟢
- Betroffenes Feld ist der **Immo-Anteil-Slider** (`min=1 max=10`), nur im
  Berater-Formular (das GF-Formular bleibt bei 1–10).
- **Tun:** Client `team/neuer-sub-berater-form.tsx:164` (`max={10}`→`7`) +
  Hinweistext `:171` („1–10 %"→„1–7 %"). Server `team/actions.ts:422-425`
  (`createSubBerater`): echten Bounds-Check `1 ≤ immoAnteil ≤ 7` mit Error-Return
  ergänzen (heute nur `Math.min(…,100)`, keine echte Prüfung).
- GF-Pfad (`stufe-table.tsx`, `createBerater`) **nicht** anfassen.

---

## Phase F2 — Sparten-Trennung Performance & Verifikation

### P3 · Berater-Performance je Bereich, Immo ohne VV, reine Immo-Berater ohne VV 🟢
- Befund: Der Immo/VV-Split existiert schon als aufklappbare Boxen
  (`performance/page.tsx:79-104`, `performance-view.tsx:222-233`), **aber es gibt
  keinen Filter auf `profiles.bereich`** — die „Umsatz VV"-Box wird für **jeden**
  Berater gerendert, auch für reine Immobilien-Berater. `profiles.bereich` ist ein
  Array (`bereich_enum[]`).
- **Tun:**
  1. `profiles.bereich` je Berater in die Performance-View durchreichen.
  2. VV-Spalte/-Box/-Zahlen nur rendern, wenn `bereich.includes("vv")` — sonst
     taucht VV **nirgends** auf (Kunde: „bei dem darf VV nirgends vorkommen").
  3. Headline-„Umsatz" bereichssauber: für reine Immo-Berater = nur Immo.
  4. Analog prüfen: `beraterPerformance()` (`analytics.ts:646-675`) wirft heute
     beide Bereiche in einen `umsatz` — im Immo-Kontext ohne VV ausweisen.

### P1 · Heiße-Leads-To-do → nur Immobilien ✅
- **Bereits umgesetzt** (Entscheidung 16.07.): `heisseLeads()` filtert über
  `interesse.includes("immobilien")` (`analytics.ts:697-712`), Untertitel sagt
  bereits „(nur Immobilien)". → Im Live-Build verifizieren, ggf. nichts zu tun.

### P2 · Aufgaben „überfällig zuerst" ✅
- **Bereits umgesetzt** auf der Aufgaben-Seite: Gruppierung Überfällig → Heute →
  Diese Woche → Später → Ohne Termin → Erledigt (`aufgaben-view.tsx:43-88`),
  DB-Query sortiert `faellig_am` aufsteigend, Untertitel sagt „überfällig zuerst".
- → Verifizieren. Optional: dieselbe Überfällig-Priorisierung ins Dashboard-Widget
  „Heute zu tun" ziehen (heute nur grob `faellig`/`weitere`, `heute-block.tsx`).

---

## Phase F3 — Dokumente

### P5 · „Dokumente lassen sich nicht einfügen" (Bug) 🟢
- Upload läuft **rein clientseitig** gegen Supabase Storage; Fehler zeigen nur
  einen generischen Toast (`document-checklist.tsx:157-160`) → darum „Ursache
  unklar". Zwei Top-Verdächtige:
  1. **Feature-Flag** `DOKUMENT_UPLOAD_AKTIV` (`config/enums.ts:139-142`, Repo =
     `true`): Steht er im Live-Build auf `false`, verschwinden alle
     Anhängen-Buttons **ohne Fehlermeldung**.
  2. **Bucket `kundendokumente` fehlt** in der Live-Instanz (Buckets nur per
     Migration `0004`/`0012` angelegt; kein `config.toml` im Repo → nicht
     verifizierbar, ob gelaufen). Dann: „Bucket not found".
- **Tun (in Reihenfolge):** (a) Live-Diagnose — Flag im Deploy prüfen, Bucket im
  Supabase-Dashboard prüfen, echten HTTP-Status des `storage/v1/object`-Requests
  ansehen (404=Bucket fehlt, 403/42501=RLS). (b) Ursache beheben (Bucket anlegen /
  Flag setzen / RLS). (c) **Fehlermeldungen aussagekräftig machen**, damit so ein
  Fall nie wieder „unklar" ist (echten Storage-Fehler im Toast zeigen + loggen).
- Hinweis: (b) kann Zugriff aufs Supabase-Dashboard des Kunden erfordern.
- Rand-Design (kein Bug): Bei **VV-Deals** gibt es bewusst keine Upload-UI
  (`deal-dokumente.tsx:17`); beim Kontakt-Anlegen nur bei Immobilien-Interesse.

### P6 · „Reservierungsformular" aus der Vorlagenliste entfernen 🟢
- Sichtbare Liste kommt aus der **DB-Tabelle** `document_types` (nicht Enum), dort
  per Migration `0015` eingefügt.
- **Tun:** Neue Migration `update public.document_types set aktiv=false where
  name='Reservierungsformular'` — **deaktivieren, nicht löschen** (FK aus
  `contact_document_status` ohne Cascade würde hartes Löschen blockieren).
  „Reservierungsvereinbarung" bleibt. Zusätzlich Copy-Text `dokumente/
  portal-view.tsx:125` und toten Enum `config/enums.ts:111` angleichen.

---

## Phase F4 — Optional / Ausbau

### P4 · Board „reserviert / verbrieft je Berater" 🟡 („wenn easy" — ist easy)
- Rohdaten alle vorhanden, ohne Schemaänderung ableitbar (Muster wie
  `volumenGewonnen(beraterId)`).
- **Interpretation (bestätigen lassen):**
  - **Reserviert** = Deal in/über Phase „Objekt reserviert" bzw. `objekt_status =
    'Reserviert'` (Summe Kaufpreis je Berater).
  - **Verbrieft** = „zum Notar gebracht" = Deal hat Phase „Notartermin" erreicht
    (`position ≥ Notartermin`) — dieser Punkt ist im Code schon der
    Realisierungs-Zeitpunkt (`analytics.ts:352-369`). „verbrieft" existiert als
    Begriff noch nicht; wird darüber abgebildet.
- **Tun:** kleine Aggregationsfunktion + Board in der Berater-Performance (nur
  Immobilien).

---

## Offen / blockiert

### P9 · „Feld für eine einmalige Summe" 🔴 KUNDEN-RÜCKFRAGE
- Kein solches Feld vorhanden; Bedeutung mehrdeutig (Provision vs. VV-Basis vs.
  reines Infofeld) → siehe Rückfrage unten. Umsetzung erst nach Klärung:
  ggf. neue Migration (`deals`-Spalte) + Typ `database.ts` + Formular
  (`deal-form.tsx`, `actions.ts`, `neu`/`[id]`) + evtl. `provision.ts`/Reporting.

### P10 · Team-Verwaltung ⚪
- Im Dokument selbst als „Offen" markiert → kundenseitig noch offen, keine
  Vorgabe. Keine Aktion, bis der Kunde nachliefert.

---

## Rückfrage an den Kunden (P9)

„Ein Feld für eine einmalige Summe" ist unterspezifiziert. Zur sauberen Umsetzung:

1. **Bei welchem Deal-Typ** soll das Feld erscheinen — Immobilien, VV oder beide?
2. **Was stellt die Summe dar?** Drei plausible Lesarten:
   - **a) VV-Einmalanlage:** einmalige Kapitalanlage zusätzlich zum monatlichen
     Sparbeitrag → erhöht die BWS (und damit die Provision).
   - **b) Feste Einmalprovision (Immo):** fixe Provisionssumme für den Deal —
     statt oder zusätzlich zum Prozentsatz.
   - **c) Reines Infofeld:** wird nur gespeichert/angezeigt, ohne Einfluss auf
     Provisions-/Einkommensberechnung.
3. Falls es in eine Berechnung einfließt: **ersetzt** es den Prozentsatz oder
   kommt es **obendrauf**?
