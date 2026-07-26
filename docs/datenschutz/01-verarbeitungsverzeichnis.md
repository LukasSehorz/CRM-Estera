# Verzeichnis von Verarbeitungstätigkeiten

nach Art. 30 Abs. 1 DSGVO · **ENTWURF** — Stand 26.07.2026

> **Hinweis zur Verwendung:** Erstellt vom technischen Dienstleister auf Basis
> des tatsächlichen Datenmodells des CRM. Die technischen Angaben (Kategorien,
> Empfänger, Maßnahmen) sind aus dem Live-System abgeleitet und geprüft. Die
> mit `[AUSFÜLLEN]` markierten Felder kann nur die Estera GmbH beantworten.
> Vor Inkraftsetzung durch einen Anwalt oder Datenschutzbeauftragten prüfen
> und dann zeichnen lassen.

---

## Verantwortlicher

| Feld | Angabe |
|---|---|
| Name | Estera GmbH |
| Anschrift | `[AUSFÜLLEN]` |
| Handelsregister | `[AUSFÜLLEN]` |
| Geschäftsführung | Ioannis Orfanidis `[bestätigen]` |
| Kontakt Datenschutz | `[AUSFÜLLEN — E-Mail für Betroffenenanfragen]` |
| Datenschutzbeauftragter | Nicht benannt — unter 20 Personen mit automatisierter Verarbeitung (§ 38 BDSG). Siehe [Schwellwertanalyse](02-schwellwertanalyse-dsfa.md). |

---

## V1 — Vertrieb Kapitalanlage-Immobilien

| Feld | Angabe |
|---|---|
| **Zweck** | Gewinnung, Betreuung und Vermittlung von Interessenten für Kapitalanlage-Immobilien; Nachverfolgung des Vertriebsprozesses vom Erstkontakt bis zum Notartermin |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b (Vertragsanbahnung und -durchführung); für die Erstansprache je nach Leadherkunft lit. a oder f — `[AUSFÜLLEN: Herkunft der Leads]` |
| **Betroffene** | Interessenten, Kunden |
| **Datenkategorien** | Vor-/Nachname, E-Mail, Telefon, Interessengebiet, Leadquelle, Kontaktstatus, Terminstatus |
| | **Finanzdaten:** monatlicher Nettoverdienst, Eigenkapital, Finanzierungsrahmen, Finanzierungseinschätzung samt Betrag und Status |
| | **Deal-Daten:** Objektadresse, Kaufpreis, Notartermin, Objektstatus, freie Bemerkungen |
| **Empfänger** | Zuständiger Berater; Geschäftsführung; übergeordnete Struktur-Partner (nur Deal-Daten, siehe Hinweis unten); Backoffice |
| **Auftragsverarbeiter** | Supabase (Datenbank/Speicher, AWS Frankfurt); Hosting-Anbieter `[AUSFÜLLEN nach Umstellung]` |
| **Drittlandtransfer** | Datenbank: nein (EU/Frankfurt). Anwendungsserver: `[AUSFÜLLEN — derzeit offen, siehe docs/dsgvo.md Abschnitt 4.2]` |
| **Löschfrist** | `[AUSFÜLLEN]` — abhängig von der GwG-Prüfung. Vorschlag: Kunden 5 Jahre nach Vertragsende; nicht zustande gekommene Interessenten 2 Jahre nach letztem Kontakt |
| **Technische Maßnahmen** | Siehe [TOM-Dokumentation](../dsgvo.md) Abschnitt 2 |

> **Hinweis zur Sichtbarkeit in der Struktur:** Ein übergeordneter Partner
> sieht die Deal-Daten seiner gesamten Downline (einschließlich Kundenname,
> Objektadresse, Kaufpreis, Bemerkungen), **nicht** aber deren Kontaktdaten
> oder hochgeladene Dokumente. Grund: Berechnung und Prüfung der
> Strukturprovision. Die Erforderlichkeit ist zu bestätigen — alternativ kann
> der Kundenname für die Upline pseudonymisiert werden.

---

## V2 — Vermittlung von Vermögensverwaltung / Nettopolicen

| Feld | Angabe |
|---|---|
| **Zweck** | Vermittlung von Vermögensverwaltungs- und Versicherungsprodukten; Nachverfolgung bis zur Policierung |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b |
| **Betroffene** | Interessenten, Kunden |
| **Datenkategorien** | wie V1, zusätzlich: Bewertungssumme (BWS), Berechnungsart, Zahlart, Angabe ratierlich/einmalig |
| **Empfänger** | wie V1 |
| **Auftragsverarbeiter** | wie V1 |
| **Drittlandtransfer** | wie V1 |
| **Löschfrist** | `[AUSFÜLLEN]` |
| **Technische Maßnahmen** | siehe TOM |

---

## V3 — Finanzierungsvermittlung und Unterlagenweitergabe *(kritischste Verarbeitung)*

| Feld | Angabe |
|---|---|
| **Zweck** | Zusammenstellung der Finanzierungsunterlagen und deren Bereitstellung für Finanzierungspartner (Banken) zur Bonitätsprüfung |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b für die Zusammenstellung. **Für die Weitergabe an die Bank ist eine gesonderte Grundlage erforderlich** — regelmäßig eine Einwilligung nach lit. a. `[AUSFÜLLEN: Wird eine solche Erklärung eingeholt?]` |
| **Betroffene** | Kunden, deren Finanzierung geprüft wird |
| **Datenkategorien** | **Ausweisdokumente:** Personalausweis, Reisepass, Aufenthaltstitel (Vorder- und Rückseite) |
| | **Einkommensnachweise:** die letzten drei Gehaltsabrechnungen, Lohnsteuerbescheinigung, Einkommensteuerbescheid |
| | **Bei Selbstständigen:** Steuerbescheide, Steuererklärungen |
| | **Bei Immobilienbesitz:** Nachweise zum Bestand |
| | Kapitalnachweise, sonstige beigefügte Unterlagen |
| **Empfänger** | Zuständiger Berater, Geschäftsführung — sowie **je Dokument einzeln freigeschaltete Finanzierungspartner**. Der Finanzierer sieht ausschließlich die ihm freigegebenen Dateien und den Kundennamen; kein Zugriff auf sonstige Daten. |
| **Finanzierungspartner** | `[AUSFÜLLEN — Name und Anschrift je Institut]` |
| **Auftragsverarbeiter** | Supabase (privater Speicher, Frankfurt) |
| **Drittlandtransfer** | nein für die Speicherung |
| **Löschfrist** | `[AUSFÜLLEN]` — **hier greift voraussichtlich § 8 GwG mit 5 Jahren.** Vor Festlegung anwaltlich klären. |
| **Technische Maßnahmen** | Privater Speicher ohne öffentlichen Zugriff; Zugriff über Rechteprüfung in der Datenbank; Download nur über Links mit 60 Sekunden Gültigkeit; **vollständige Protokollierung jedes Zugriffs**; Freigabe an Finanzierer einzeln durch die Geschäftsführung und jederzeit widerrufbar. Details: [TOM](../dsgvo.md) Abschnitte 2.2–2.4 |

---

## V4 — Mitarbeiter-, Struktur- und Provisionsverwaltung

| Feld | Angabe |
|---|---|
| **Zweck** | Verwaltung der Vertriebspartner, Abbildung der Vertriebsstruktur, Berechnung von Provisionen und Zielerreichung |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b i.V.m. § 26 BDSG (Beschäftigungsverhältnis) bzw. Handelsvertretervertrag |
| **Betroffene** | Berater, Backoffice, Geschäftsführung, Finanzierer, Tippgeber |
| **Datenkategorien** | Vor-/Nachname, E-Mail (Zugang), Rolle, Sparten, Vertriebler-Stufe, Immobilien-Provisionsanteil, übergeordneter Partner, Monatsziele, Status aktiv/gesperrt |
| | **Tippgeber:** Name, Provisionssatz, zugeordneter Betreuer |
| **Empfänger** | Geschäftsführung; übergeordnete Partner sehen ihre Downline |
| **Auftragsverarbeiter** | wie V1 |
| **Löschfrist** | `[AUSFÜLLEN]` — üblich: Löschung bzw. Sperrung des Zugangs bei Ausscheiden, Aufbewahrung der abrechnungsrelevanten Daten nach handels- und steuerrechtlichen Fristen (regelmäßig 10 Jahre) |
| **Technische Maßnahmen** | siehe TOM; ausgeschiedene Personen werden gesperrt und verlieren sofort jeden Datenzugriff |

---

## V5 — Protokollierung der Dokumentzugriffe

| Feld | Angabe |
|---|---|
| **Zweck** | Nachweis- und Sicherheitszwecke: Erfüllung der Rechenschaftspflicht (Art. 5 Abs. 2), Beantwortung von Auskunftsersuchen (Art. 15), Aufklärung im Fall einer Datenschutzverletzung (Art. 33) |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. c i.V.m. Art. 5 Abs. 2, Art. 32 |
| **Betroffene** | Mitarbeiter und Finanzierer (als Handelnde), Kunden (als Bezug des Dokuments) |
| **Datenkategorien** | Zeitpunkt, handelnde Person, deren Rolle, Art des Zugriffs (Upload, Ansicht, Löschung, Sammelexport, Freigabe), Dateiname, Zuordnung zu Dokument und Kunde. **Keine Dateiinhalte.** |
| **Empfänger** | ausschließlich die Geschäftsführung |
| **Löschfrist** | `[AUSFÜLLEN]` — Vorschlag: 12 Monate. Muss mindestens die Frist für Auskunftsersuchen abdecken, darf aber nicht zur Dauerüberwachung von Mitarbeitern werden. **Vor Festlegung mit dem Anwalt und ggf. der Mitarbeitervertretung abstimmen.** |
| **Technische Maßnahmen** | Einträge sind für niemanden änderbar oder löschbar; das Protokoll übersteht auch die Löschung des zugehörigen Dokuments |

> **Hinweis:** Diese Verarbeitung ist selbst zustimmungsrelevant, weil sie das
> Verhalten von Mitarbeitern erfasst. Sie dient ausdrücklich **nicht** der
> Leistungskontrolle. Das sollte gegenüber den Mitarbeitern transparent gemacht
> werden — die [Verpflichtungserklärung](03-verpflichtung-datengeheimnis.md)
> enthält dazu einen Hinweis.

---

## Allgemeine technische und organisatorische Maßnahmen

Vollständig beschrieben in [docs/dsgvo.md](../dsgvo.md), Abschnitt 2. Zusammenfassung:

- Zugriffstrennung in der Datenbank erzwungen, nicht nur in der Oberfläche
- Verschlüsselung bei Übertragung und Speicherung
- Dokumente in privatem Speicher, Zugriff nur über kurzlebige Links
- Vollständige Protokollierung aller Dokumentzugriffe
- Sofortige Zugangssperre für ausgeschiedene Personen
- Kein Self-Signup; Zugänge nur durch die Geschäftsführung
- Wirksamkeit am 26.07.2026 gegen das Live-System geprüft (Protokoll: TOM Abschnitt 6)

---

**Erstellt:** 26.07.2026 · **Freigegeben von:** `[Name, Datum, Unterschrift]`
