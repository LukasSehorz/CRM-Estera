# Estera CRM — Datenmodell

> Die fachliche Übersetzung der Anforderungen (`docs/anforderungen.md`) in
> Tabellen. Aus diesem Dokument werden die Supabase-Migrations gebaut.
> Bei Widersprüchen gilt `docs/anforderungen.md` als Source of Truth.

## `profiles`
Verknüpft mit `auth.users`, repräsentiert die Berater.

| Spalte | Typ | Beschreibung |
|---|---|---|
| id | uuid | FK → auth.users |
| vorname | text | |
| nachname | text | |
| rolle | enum | `berater` \| `geschaeftsfuehrung` |
| bereich | text[] | `immobilien`, `vv` — wofür der Berater zuständig ist |
| aktiv | bool | |

## `contacts`
Kontakte / Leads.

**Basis:**
- vorname, nachname, email, telefon (text)
- berater_id (FK → profiles)
- status (enum: Neu / In Bearbeitung / Qualifiziert / Nicht erreicht / Kalt)
- termin_status (enum: Nicht vereinbart / Vereinbart / Durchgeführt)
- leadquelle (enum: TikTok / Instagram / Facebook / Empfehlung / Kooperationen / Webseite / Sonstige)
- interesse (text[]: `immobilien` und/oder `vv` — steuert Pipeline-Sicht)

**Finanzdaten:**
- nettoverdienst_monatlich, eigenkapital (numeric)
- finanzierungsrahmen (enum: Bis 250k / 250–350k / 350–500k / 500–700k / 700k+)

**Einschätzung:**
- einschaetzung_erhalten (bool)
- datum_einschaetzung (date)
- eingeschaetzter_betrag (numeric)
- einschaetzung_durch (text)
- einschaetzung_status (enum: Ausstehend / Positiv / Bedingt positiv / Abgelehnt)

**Unterlagen:**
- unterlagen_vollstaendig (bool)
- fehlende_unterlagen (text)

**Meta:** created_at, updated_at

## `pipeline_stages`
Phasen, geseedet exakt nach Spec.

| Spalte | Typ |
|---|---|
| id | uuid |
| bereich | enum (immobilien \| vv) |
| name | text |
| position | int |
| wahrscheinlichkeit | int (%) |
| is_won | bool |
| is_lost | bool |

**Seed Immobilien:** Neuer Lead 10 → Kontakt hergestellt 20 → Termin vereinbart 30 → Termin durchgeführt 50 → Objekt reserviert 70 → Finanzierung fertig 85 → Notartermin 95 → Kauf abgeschlossen 100 (`is_won`) → Storniert 0 (`is_lost`)

**Seed VV:** Interessent 10 → Termin vereinbart 30 → Follow Up 50 → Strategie erstellt 75 → Abgeschlossen 100 (`is_won`) → Nicht abgeschlossen 0 (`is_lost`)

## `deals`
Eine Tabelle, `bereich`-Diskriminator, typ-spezifische Felder nullable.

**Gemeinsam:**
- dealname, berater_id, contact_id (FK), bereich
- stage_id (FK → pipeline_stages)
- naechster_termin (date), bemerkungen (text)

**Immobilien-Felder:**
- kaufpreis (numeric)
- objekt_adresse (text)
- objekt_status (enum: Verfügbar / Reserviert / Verkauft)
- notartermin (date)

**VV-Felder:**
- bws (numeric)
- berechnungsart (enum: mit Factoring / ohne Factoring / alter Provsatz)
- deal_typ (text, default „Nettopolice")
- ratierlich (bool)
- tippgeber (text)

**Meta:** created_at, updated_at, closed_at

## `deal_stage_history`
Das Herzstück für alle Auswertungen.

| Spalte | Typ | Beschreibung |
|---|---|---|
| id | uuid | |
| deal_id | uuid | FK → deals |
| stage_id | uuid | FK → pipeline_stages |
| entered_at | timestamptz | Eintritt in die Phase |
| left_at | timestamptz | null, wenn aktuell |
| changed_by | uuid | FK → profiles |

Bei jedem Phasenwechsel: alten Eintrag `left_at` setzen, neuen Eintrag mit
`entered_at` anlegen. Am besten per DB-Trigger, damit es nie vergessen wird.

---

## Definitionen für die Analytics (exakt so umsetzen, nicht raten)

- **Erster Termin** = Eintritt in Phase „Termin durchgeführt"
- **Deal-Time** = `entered_at` von „Termin durchgeführt" bis `closed_at` (gewonnen)
- **Closing Rate** = gewonnene Deals ÷ Deals, die je „Termin durchgeführt" erreicht haben
- **Konversionsrate Phase n→n+1** = Deals, die je n+1 erreicht haben ÷ Deals, die je n erreicht haben
- **Pipeline-Volumen** = Summe (Immobilien: `kaufpreis`, VV: `bws`) aller Deals in offenen Phasen (nicht `is_won`/`is_lost`).
  **Achtung:** Kaufpreis und BWS sind unterschiedliche Größen — im Dashboard pro Bereich getrennt ausweisen, konsolidierte Summe mit Hinweis kennzeichnen.

## Offener Punkt zur Klärung mit dem Kunden
**„Heiße Leads"** (Termin durchgeführt, aber kein Deal in fortgeschrittener Phase):
Es braucht eine klare Grenze, ab welcher Phase ein Deal als „fortgeschritten" gilt.
Vorschlag als Default: Kontakt mit `termin_status = Durchgeführt`, der keinen Deal
ab Phase „Objekt reserviert" (Immo) bzw. „Strategie erstellt" (VV) hat.
Diese Annahme im Code markieren und bestätigen lassen.

---

## Fachkonzept-Erweiterung (Stand 26.06.2026, Migration 0003)

Bestätigt vom Kunden; ersetzt/ergänzt die obigen Punkte, wo genannt.

### Immobilien-Pipeline (neu, 1.3)
Ersetzt die alte Immobilien-Pipeline. Neue Phasen (Position · Wahrscheinlichkeit):
Neuer Lead (1·10) → T1 Konzept (2·25) → T2 Objektvorstellung (3·40) →
Objekt reserviert (4·60) → Finanzierung in Prüfung (5·80) → Notartermin (6·95)
→ Kauf abgeschlossen (7·100, `is_won`) → Storniert (8·0, `is_lost`).
Bestehende Deals wurden umgehängt (Kontakt hergestellt→T1, Termin
vereinbart/durchgeführt→T2, Finanzierung fertig→Finanzierung in Prüfung).
**Analytics-Anpassung:** „Erster Termin" = T1 Konzept; Deal-Time = T1 bis
Notartermin/Abschluss.

### Finanzierungsrahmen (1.1)
`contacts.finanzierungsrahmen_betrag numeric` ist jetzt führend (freier Betrag).
Presets (250k…700k) sind nur UI-Schnellauswahl. Die alte Enum-Spalte
`finanzierungsrahmen` bleibt als Alt-Feld erhalten, wird aber nicht mehr genutzt.

### VV-Provisionslogik (Teil 2)
Neue `deals`-Felder: `sparbeitrag`, `anzahl_jahre`, `factoring (bool)`,
`tippgeber_satz (%)`. Das alte `berechnungsart`-Enum entfällt.
- **BWS** = Sparbeitrag × 12 × Jahre.
- **Grundprovision** = BWS × 7,8 % (global fix).
- **mit Factoring**: Netto = Grundprovision × 90 % (10 % Gebühr).
- **ohne Factoring (Einbehalt)**: 85 % sofort, 15 % nach 12 Monaten.
- **Tippgeber-Anteil** = Netto × Tippgeber-%.
- **Vertriebler-Anteil** = Netto × Vertriebler-Stufe.
- **Hausanteil** = Netto − Vertriebler − Tippgeber.
- **ratierlich**: Monatsrate = Netto ÷ 60.
Berechnung zentral in `src/lib/provision.ts` (nichts wird gespeichert außer den
Eingaben). Selbsttest gegen Fachkonzept-Beispiel A.

### Vertriebler-Stufe (Rechte!)
`profiles.vertriebler_stufe numeric` (%). GF = 70, Berater individuell (~30).
Wird **ausschließlich** vom Admin (= Geschäftsführung) gesetzt — über die
SECURITY-DEFINER-Funktion `set_vertriebler_stufe(target, stufe)`, die selbst
`is_gf()` prüft. `profiles` hat weiterhin keine UPDATE-Policy → ein Berater
kann seine eigene Stufe nie ändern.

### Offen / als eigener Baustein geplant
- **Kundendokumente (1.2):** Upload je Kontakt (Supabase Storage), Checkliste,
  Zugriff nur Berater + Admin, DSGVO-konform. Kommt nach der VV-Logik.
- **Listen (5d):** „mit/ohne Einbehalt", offener Einbehalt je Kunde
  (Betrag · Status · Fälligkeit „in X Monaten").