# Estera CRM – Anforderungen

> Anforderungsdokument für die Implementierung · Sebastian Meilbeck, Estera GmbH
> Stand: 15.06.2026 · Estera GmbH · Ansprechpartner: Sebastian Meilbeck

Dieses Dokument beschreibt die Anforderungen an das CRM-System für Estera. Es definiert die Geschäftsbereiche, die abzubildenden Datenstrukturen, Pipelines, Übersichten und Reporting-Anforderungen. Ziel ist eine klare Grundlage für die Implementierung – unabhängig davon, mit welchem CRM-System die Umsetzung erfolgt.

---

## 1. Geschäftsbereiche

Das CRM bildet zwei separate Geschäftsbereiche ab, die parallel laufen, aber sauber getrennt sind. Konsolidierte Übersichten zeigen aber alles gemeinsam.

| Bereich | Geschäft | Priorität |
|---|---|---|
| Estera Immobilien | Kapitalanlageimmobilien-Vertrieb | Primär |
| Estera Vermögensverwaltung | Nettopolicen / Vermögensaufbau | Sekundär |

Jeder Bereich hat eine eigene Pipeline mit eigenen Phasen. Ein Kontakt kann zu einem oder beiden Bereichen gehören – das wird über das Feld „Interesse" gesteuert (Mehrfachauswahl).

---

## 2. Pipelines

### 2.1 Immobilien-Pipeline

| # | Phase | Abschlusswahrscheinlichkeit |
|---|---|---|
| 1 | Neuer Lead | 10 % |
| 2 | Kontakt hergestellt | 20 % |
| 3 | Termin vereinbart | 30 % |
| 4 | Termin durchgeführt | 50 % |
| 5 | Objekt reserviert | 70 % |
| 6 | Finanzierung fertig | 85 % |
| 7 | Notartermin | 95 % |
| 8 | Kauf abgeschlossen | 100 % |
| 9 | Storniert | 0 % |

### 2.2 Vermögensverwaltung-Pipeline

| # | Phase | Abschlusswahrscheinlichkeit |
|---|---|---|
| 1 | Interessent | 10 % |
| 2 | Termin vereinbart | 30 % |
| 3 | Follow Up | 50 % |
| 4 | Strategie erstellt | 75 % |
| 5 | Abgeschlossen | 100 % |
| 6 | Nicht abgeschlossen | 0 % |

---

## 3. Kontakte – Datenstruktur

Pro Kontakt müssen folgende Informationen erfasst und auf einen Blick sichtbar sein:

### 3.1 Basis-Felder

| Feld | Optionen / Typ |
|---|---|
| Vorname | Text |
| Nachname | Text |
| E-Mail | Text |
| Telefon | Text |
| Berater | Dropdown (siehe Abschnitt 6) |
| Status | Neu / In Bearbeitung / Qualifiziert / Nicht erreicht / Kalt |
| Termin Status | Nicht vereinbart / Vereinbart / Durchgeführt |
| Leadquelle | TikTok / Instagram / Facebook / Empfehlung / Kooperationen / Webseite / Sonstige |
| Interesse | Immobilien und/oder Vermögensverwaltung (Mehrfachauswahl) |

**Wichtig zum Feld Interesse:** Die Auswahl entscheidet, in welcher Pipeline / welchem Bereich der Kontakt geführt wird. „Immobilien" aktiviert automatisch die Immobilien-Pipeline-Sicht, „Vermögensverwaltung" die VV-Pipeline-Sicht. Sind beide aktiv, taucht der Kontakt in beiden Bereichen auf.

### 3.2 Finanzdaten

| Feld | Typ |
|---|---|
| Nettoverdienst monatlich | Zahl (€) |
| Eigenkapital | Zahl (€) |
| Finanzierungsrahmen | Dropdown: Bis 250k / 250–350k / 350–500k / 500–700k / 700k+ |

### 3.3 Finanzierungseinschätzung

| Feld | Typ |
|---|---|
| Einschätzung erhalten? | Ja / Nein |
| Datum der Einschätzung | Datum |
| Eingeschätzter Betrag | Zahl (€) |
| Einschätzung durch | Text (Bank / Finanzierer) |
| Einschätzung Status | Ausstehend / Positiv / Bedingt positiv / Abgelehnt |

### 3.4 Unterlagen

| Feld | Typ |
|---|---|
| Unterlagen vollständig? | Ja / Nein |
| Fehlende Unterlagen | Freitext |

---

## 4. Deals – Datenstruktur

### 4.1 Felder für Immobilien-Deals

| Feld | Typ / Beschreibung |
|---|---|
| Dealname | Text · Konvention: „Kundenname – Objektadresse" |
| Berater | Dropdown (siehe Abschnitt 6) |
| Kaufpreis | Zahl (€) · relevant für Pipeline-Volumen |
| Objekt-Adresse | Text |
| Objekt-Status | Verfügbar / Reserviert / Verkauft |
| Notartermin | Datum |
| Nächster Termin | Datum |
| Bemerkungen | Freitext |

### 4.2 Felder für Vermögensverwaltung-Deals

| Feld | Typ / Beschreibung |
|---|---|
| Dealname | Text |
| Berater | Dropdown |
| BWS (Bewertungssumme) | Zahl (€) |
| Berechnungsart | Dropdown: mit Factoring / ohne Factoring / alter Provsatz |
| Deal-Typ | Nettopolice |
| ratierlich | Ja / Nein |
| Tippgeber | Text |
| Nächster Termin | Datum |
| Bemerkungen | Freitext |

---

## 5. Übersichten und Listen

Das System muss folgende Übersichten auf einen Klick bereitstellen:

### 5.1 Übergreifende Listen

- Alle Kontakte (gesamt – Immobilien + Vermögensverwaltung)
- Alle Immobilien-Kontakte (gefiltert nach Interesse = Immobilien)
- Alle Vermögensverwaltung-Kontakte (gefiltert nach Interesse = VV)
- Alle eingeschätzten Kunden (sortiert nach Finanzierungsvolumen, absteigend)
- Heiße Leads (Termin durchgeführt, aber noch kein Deal in fortgeschrittener Phase)
- Offene Leads (noch kein Termin vereinbart)

### 5.2 Pro Berater

- Seine Kontakte (alle ihm zugeordneten Kunden)
- Seine Deals (alle ihm zugeordneten Verkaufschancen)
- Sein Umsatz – Summe der abgeschlossenen Deals (Monat / Quartal / Jahr)
- Sein Pipeline-Volumen – Summe der offenen Deal-Beträge

### 5.3 Termin- und Status-bezogen

- Notartermine diese Woche
- Nächste Kundentermine (7 Tage)
- Deals in Finanzierung
- Verkaufte Deals (Reporting)

---

## 6. Berater-Setup

Das CRM hat folgende Berater hinterlegt. Bei der Anlage eines Kontakts oder Deals wird der Berater zugewiesen.

| Berater | Bereich |
|---|---|
| Max Mustermann (Geschäftsführung) | Immobilien / Vermögensverwaltung |
| Lisa Mustermann | Immobilien |
| Anna Mustermann | Immobilien |
| Tom Mustermann | Immobilien |
| Felix Mustermann | Immobilien |
| Julia Mustermann | Immobilien |
| Niklas Mustermann | Immobilien |

**Anforderung Multi-User:** Jeder Berater bekommt zukünftig einen eigenen Login. Rechte-Konzept: Jeder Berater sieht nur seine eigenen Kontakte und Deals. Die Geschäftsführung sieht alles.

---

## 7. Dashboards

Folgende Dashboards/Auswertungen werden benötigt:

### 7.1 Pipeline-Volumen-Dashboard

- Aktuelles Pipeline-Volumen gesamt (Summe aller offenen Deal-Beträge)
- Pipeline-Volumen pro Phase (welche Phase hat wie viel Volumen)
- Pipeline-Volumen pro Berater
- Konversionsraten zwischen den Phasen
- Durchschnittliche Deal-Time gesamt – vom ersten Termin bis Notar/Abschluss (firmenweit)
- Closing Rate gesamt – Verhältnis abgeschlossene Deals zu durchgeführten Ersterminen

### 7.2 Berater-Performance

- Umsatz pro Berater (Monat / Quartal / Jahr) – gewonnene Deals
- Anzahl offener Deals pro Berater
- Durchschnittliche Deal-Größe pro Berater
- Durchschnittliche Deal-Time pro Berater – vom ersten Termin bis Notar/Abschluss
- Closing Rate pro Berater – z. B. 10 Ersttermine, davon 1 Abschluss = 10 % Closing Rate

### 7.3 Eingeschätzte Kunden

- Alle Kontakte mit Finanzierungs-OK
- Pipeline an qualifizierten Leads (Summe eingeschätzte Beträge)
- Nach Berater und Finanzierungsrahmen filterbar

---

## 8. UI- und Bedienungsanforderungen

- **Schlank und übersichtlich:** Alle Standard-Felder/Sektionen, die für unseren Use Case nicht relevant sind, müssen ausblendbar sein.
- **Pipeline-Karten** zeigen pro Deal auf einen Blick: Berater, Kaufpreis, Objekt-Adresse, Objekt-Status.
- **Klare Trennung** der Bereiche Immobilien und Vermögensverwaltung in der Navigation.
- **Onboarding-tauglich:** Ein neuer Vertriebler muss in 15 Minuten verstehen, wo er was findet.

---

## 9. Datenfluss

So läuft der Prozess vom Lead bis zum Abschluss:

1. Neuer Lead kommt rein (TikTok / Instagram / Empfehlung)
2. Kontakt anlegen → Berater zuweisen → Interesse setzen (Immobilien und/oder VV) → Status setzen
3. Erstgespräch → Termin Status updaten
4. Bei Interesse → Deal erstellen → mit Kontakt verknüpfen
5. Deal durch die Pipeline ziehen (Berater pflegt Phasen)
6. Abschluss: Kauf/Vertrag abgeschlossen oder Storniert