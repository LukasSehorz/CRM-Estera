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
| Anschrift | Leopoldstraße 156, 80804 München |
| Handelsregister | HRB 303242, Amtsgericht München |
| USt-IdNr. | DE457539048 |
| Geschäftsführung | Sebastian Meilbeck, Ioannis Orfanidis |
| Kontakt Datenschutz | datenschutz@estera.immobilien |
| Gewerbeerlaubnis | § 34c GewO (Immobilienmakler), IHK für München und Oberbayern |
| Datenschutzbeauftragter | Nicht benannt — unter 20 Personen mit automatisierter Verarbeitung (§ 38 BDSG). Siehe [Schwellwertanalyse](02-schwellwertanalyse-dsfa.md). |

> **Hinweis zur Geldwäsche-Verpflichteteneigenschaft:** Als Immobilienmakler
> nach § 34c GewO ist die Estera GmbH nach § 2 Abs. 1 Nr. 14 GwG
> voraussichtlich **Verpflichtete**. Daraus folgen die Identifizierungspflicht
> (§ 10 GwG) und die fünfjährige Aufbewahrung der Identifizierungsunterlagen
> (§ 8 Abs. 4 GwG). Die Löschfristen unten sind entsprechend gesetzt.
> `[Bitte anwaltlich bestätigen]`

---

## V1 — Vertrieb Kapitalanlage-Immobilien

| Feld | Angabe |
|---|---|
| **Zweck** | Gewinnung, Betreuung und Vermittlung von Interessenten für Kapitalanlage-Immobilien; Nachverfolgung des Vertriebsprozesses vom Erstkontakt bis zum Notartermin |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b (Vertragsanbahnung und -durchführung). Für die **Erstansprache** je nach Herkunft des Kontakts — siehe Aufschlüsselung unten. |
| **Herkunft der Kontaktdaten** | **1. Empfehlungen (Hauptquelle):** Die Daten stammen von einem Dritten (Bestandskunde oder Tippgeber), nicht von der betroffenen Person selbst. Rechtsgrundlage der Erstansprache: Art. 6 Abs. 1 lit. f (berechtigtes Interesse an der Geschäftsanbahnung). **Es gilt die Informationspflicht nach Art. 14** — der Kontakt ist spätestens einen Monat nach Erfassung, jedenfalls aber beim ersten Kontakt zu informieren. |
| | **2. Social Media und Anzeigen:** Die betroffene Person füllt selbst ein Formular aus. Rechtsgrundlage: Art. 6 Abs. 1 lit. b (Anfrage der betroffenen Person) bzw. lit. a, soweit eine Einwilligung eingeholt wird. Informationspflicht nach **Art. 13** bei der Erhebung. |
| **Betroffene** | Interessenten, Kunden |
| **Datenkategorien** | Vor-/Nachname, E-Mail, Telefon, Interessengebiet, Leadquelle, Kontaktstatus, Terminstatus |
| | **Finanzdaten:** monatlicher Nettoverdienst, Eigenkapital, Finanzierungsrahmen, Finanzierungseinschätzung samt Betrag und Status |
| | **Deal-Daten:** Objektadresse, Kaufpreis, Notartermin, Objektstatus, freie Bemerkungen |
| **Empfänger** | Zuständiger Berater; Geschäftsführung; übergeordnete Struktur-Partner (nur Deal-Daten, siehe Hinweis unten); Backoffice |
| **Auftragsverarbeiter** | Supabase (Datenbank/Speicher, AWS Frankfurt); Hosting-Anbieter `[AUSFÜLLEN nach Umstellung]` |
| **Drittlandtransfer** | Datenbank: nein (EU/Frankfurt). Anwendungsserver: `[AUSFÜLLEN — derzeit offen, siehe docs/dsgvo.md Abschnitt 4.2]` |
| **Löschfrist** | Kunden: 5 Jahre nach Ende der Geschäftsbeziehung (§ 8 Abs. 4 GwG); Interessenten ohne Abschluss: 2 Jahre nach letztem Kontakt; reine Anfragen: 6 Monate. Abrechnungsrelevante Unterlagen 10 Jahre (§ 147 AO, § 257 HGB). `[anwaltlich bestätigen]` |
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
| **Löschfrist** | wie V1 |
| **Technische Maßnahmen** | siehe TOM |

---

## V3 — Finanzierungsvermittlung und Unterlagenweitergabe *(kritischste Verarbeitung)*

| Feld | Angabe |
|---|---|
| **Zweck** | Zusammenstellung der Finanzierungsunterlagen und deren Bereitstellung für Finanzierungspartner (Banken) zur Bonitätsprüfung |
| **Rechtsgrundlage** | Art. 6 Abs. 1 lit. b für die Zusammenstellung sowie Art. 6 Abs. 1 lit. c i.V.m. § 10 GwG für die Identifizierung. **Für die Weitergabe an den Finanzierungspartner** gilt lit. b, soweit ein schriftlicher Vermittlungsauftrag vorliegt — andernfalls Einwilligung nach lit. a. Zwei fertige Varianten: [Dokument 05](05-weitergabe-finanzierungspartner.md) |
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
| **Löschfrist** | **5 Jahre** nach Ende der Geschäftsbeziehung — § 8 Abs. 4 GwG. Die Aufbewahrungspflicht geht dem Löschanspruch nach Art. 17 vor. `[anwaltlich bestätigen]` |
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
| **Löschfrist** | Zugang wird bei Ausscheiden sofort gesperrt; abrechnungsrelevante Daten 10 Jahre (§ 147 AO, § 257 HGB) |
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
| **Löschfrist** | 12 Monate. Muss mindestens die Frist für Auskunftsersuchen abdecken, darf aber nicht zur Dauerüberwachung von Mitarbeitern werden. **Vor Festlegung mit dem Anwalt und ggf. der Mitarbeitervertretung abstimmen.** |
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
