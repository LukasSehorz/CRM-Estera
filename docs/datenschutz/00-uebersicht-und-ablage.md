# Datenschutz-Unterlagen — Übersicht, Ablage und Verwendung

Stand: 26.07.2026 · Estera CRM

Dieses Verzeichnis enthält die **Entwürfe** der Datenschutz-Unterlagen, die
Estera für den Betrieb des CRM braucht. Sie sind so weit vorbereitet, dass ein
Anwalt oder Datenschutzbeauftragter sie nur noch prüfen und freigeben muss.

> **Wichtig zum Verständnis:** Diese Dokumente sind **keine Bestandteile der
> Software**. Sie sind Unternehmensunterlagen der Estera GmbH. Was hier im
> Projekt liegt, ist der *Entwurf*. Das *verbindliche Original* ist die
> unterzeichnete Fassung in den Unterlagen des Unternehmens. Wenn sich am CRM
> etwas ändert, wird hier der Entwurf nachgezogen — das Original muss dann
> ebenfalls aktualisiert werden.

---

## Was liegt wo — und wofür braucht man es?

| Dokument | Ablage beim Mandanten | Wer sieht es | Wann braucht man es? |
|---|---|---|---|
| **AVV** Supabase + Hosting | Vertragsordner (PDF vom Anbieter) | intern | Voraussetzung, um den Dienst überhaupt nutzen zu dürfen. Erste Frage jeder Aufsichtsbehörde. |
| **[Verarbeitungsverzeichnis](01-verarbeitungsverzeichnis.md)** | Datenschutz-Ordner, gepflegt | intern | Muss der Aufsichtsbehörde **auf Anfrage** vorgelegt werden (Art. 30 Abs. 4). Lebendes Dokument. |
| **[TOM-Dokumentation](../dsgvo.md)** | Anlage zum AVV | intern | Nachweis der Schutzmaßnahmen. Entscheidend nach einem Vorfall. |
| **[Schwellwertanalyse](02-schwellwertanalyse-dsfa.md)** | Datenschutz-Ordner | intern | Nachweis, dass geprüft wurde, ob eine Folgenabschätzung nötig ist. |
| **Datenschutzhinweise** | **Website + Kundenkontakt** | **öffentlich** | Muss dem Kunden **bei Erhebung** ausgehändigt werden (Art. 13). Einziges öffentliches Dokument. |
| **[Verpflichtung Datengeheimnis](03-verpflichtung-datengeheimnis.md)** | Personalakte, je Mitarbeiter | intern | Nachweis, dass Mitarbeiter belehrt wurden. |
| **Einwilligung Finanzierer-Weitergabe** | Kundenakte | Kunde unterschreibt | Rechtsgrundlage für die Übermittlung an die Bank. |

**Faustregel zur Ablage:** Ein einziger Ordner „Datenschutz" beim Mandanten —
digital oder physisch — mit allem außer den Datenschutzhinweisen (die gehören
auf die Website) und den Verpflichtungserklärungen (die gehören in die
Personalakten).

---

## Reihenfolge der Erledigung

1. **AVV abschließen** — 10 Minuten, größter Effekt, keine Vorarbeit nötig
2. **Löschfristen klären** (GwG-Frage an den Anwalt) — blockiert Punkt 3
3. **Verarbeitungsverzeichnis** freigeben — braucht die Löschfristen aus Punkt 2
4. **Schwellwertanalyse** vom Anwalt gegenzeichnen lassen
5. **Datenschutzhinweise** vom Anwalt erstellen lassen und veröffentlichen
6. **Verpflichtungserklärungen** von allen Mitarbeitern unterschreiben lassen
7. **Einwilligungstext** für die Finanzierer-Weitergabe vom Anwalt erstellen

Punkte 1, 6 und 7 sind unabhängig und können sofort starten.

---

## Was noch fehlt und nur der Mandant beantworten kann

Diese Angaben sind in den Entwürfen als `[AUSFÜLLEN]` markiert:

- Vollständiger Firmenname, Anschrift, Handelsregisternummer
- Unterliegt Estera dem Geldwäschegesetz (§ 8 GwG)?
- Aufbewahrungsfristen für Kundenunterlagen
- Herkunft der Lead-Daten (eigene Website, Zukauf, Empfehlung?)
- Namen und Anschriften der Finanzierungspartner
- Wird ein Steuerberater oder externer Dienstleister mit Daten versorgt?

---

## Wiedervorlage

| Anlass | Was ist zu tun |
|---|---|
| Neues Feature mit neuen Datenfeldern | Verarbeitungsverzeichnis ergänzen |
| Wechsel des Hosting-Anbieters | Neuer AVV, Verzeichnis anpassen |
| Deutliches Wachstum (Richtwert: über 1.000 Kunden) | **Schwellwertanalyse neu bewerten** — ab dieser Größe kann eine Folgenabschätzung pflichtig werden |
| Ab 20 Personen mit Datenverarbeitung | Datenschutzbeauftragten benennen (§ 38 BDSG) |
| Jährlich | Verzeichnis und TOM durchsehen |
