# Schwellwertanalyse — Ist eine Datenschutz-Folgenabschätzung erforderlich?

nach Art. 35 DSGVO · **ENTWURF zur anwaltlichen Prüfung** — Stand 26.07.2026

> **Zweck dieses Dokuments:** Art. 35 verlangt eine Folgenabschätzung nur bei
> „voraussichtlich hohem Risiko". Ob das vorliegt, muss der Verantwortliche
> prüfen — und die Prüfung **dokumentieren**, auch wenn sie negativ ausfällt.
> Dieses Dokument ist diese Prüfung.
>
> **Offenheit vorweg:** Das Ergebnis ist vertretbar, aber **nicht eindeutig**.
> Die Abwägung ist unten offengelegt. Sie muss von einem Anwalt oder
> Datenschutzbeauftragten bestätigt werden.

---

## 1. Ausgangslage

Das CRM verarbeitet Kontakt-, Finanz- und Ausweisdaten von Interessenten und
Kunden der Estera GmbH sowie Daten der eigenen Vertriebspartner.

**Zeitpunkt dieser Bewertung:** Das System wurde im Juli 2026 fertiggestellt und
für den Produktivbetrieb vorbereitet. Zum Stichtag sind **keine Echtdaten
erfasst** — das System wurde vor der Übergabe vollständig geleert, sämtliche
Testdaten wurden entfernt.

Diese Bewertung ist daher **vorausschauend** angelegt. Das ist rechtlich der
richtige Weg: Art. 35 DSGVO verlangt die Prüfung **vor Beginn** der
Verarbeitung und stellt auf Art, Umfang, Umstände und Zwecke der
**beabsichtigten** Verarbeitung ab — nicht auf einen Datenbestand, den es zu
diesem Zeitpunkt naturgemäß noch nicht gibt.

**Geplante Größenordnung** (Angabe der Estera GmbH):

| Kennzahl | Erwartung |
|---|---|
| Interessenten und Kunden im ersten Jahr | `[AUSFÜLLEN — Schätzung genügt]` |
| Mit dem System arbeitende Berater | `[AUSFÜLLEN]` |
| Weitere Nutzer (Geschäftsführung, Backoffice, Finanzierer) | `[AUSFÜLLEN]` |
| Kundendokumente je Finanzierungsfall | etwa 5 bis 10 |

Diese Größenordnung ist für die Bewertung entscheidend — siehe Kriterium 5 in
Abschnitt 3 und die Abwägung in Abschnitt 4.

> **Bestätigung nach Aufnahme des Betriebs:** Die Bewertung wird **vier Wochen
> nach Produktivstart** anhand der dann tatsächlich erfassten Zahlen überprüft
> und bestätigt oder angepasst. Das Ergebnis wird in Abschnitt 6 dieses
> Dokuments festgehalten. Damit ist sowohl die Prüfung vor Beginn der
> Verarbeitung als auch die Kontrolle am realen Bestand dokumentiert.

---

## 2. Prüfung der Pflichtfälle nach Art. 35 Abs. 3

| Tatbestand | Erfüllt? | Begründung |
|---|---|---|
| **lit. a** — systematische und umfassende Bewertung persönlicher Aspekte, die auf automatisierter Verarbeitung beruht und als Grundlage von Entscheidungen mit Rechtswirkung dient | **Nein** | Die Finanzierungsentscheidung trifft die Bank, nicht das CRM. Das System speichert die Einschätzung lediglich. Die einzige automatische Einstufung („qualifizierter Lead" ab 2.500 € Netto und 10.000 € Eigenkapital) ist eine reine Vertriebssortierung ohne Rechtswirkung für den Betroffenen. |
| **lit. b** — umfangreiche Verarbeitung besonderer Kategorien (Art. 9) oder von Daten über Straftaten | **Nein** | Es werden keine Daten nach Art. 9 verarbeitet. Ausweiskopien und Einkommensnachweise sind zwar hochsensibel, fallen aber nicht unter Art. 9 (keine Gesundheits-, Religions-, Gewerkschafts- oder biometrischen Identifikationsdaten). Ausweisfotos werden nicht zur biometrischen Identifizierung genutzt. |
| **lit. c** — systematische umfangreiche Überwachung öffentlich zugänglicher Bereiche | **Nein** | Findet nicht statt. |

**Zwischenergebnis:** Kein Pflichtfall nach Art. 35 Abs. 3.

---

## 3. Prüfung anhand der Kriterien des Europäischen Datenschutzausschusses

Der EDSA (vormals Art.-29-Gruppe, WP 248) nennt neun Kriterien. Als Faustregel
gilt: Ab **zwei** erfüllten Kriterien ist eine Folgenabschätzung in der Regel
durchzuführen.

| # | Kriterium | Bewertung |
|---|---|---|
| 1 | Bewerten oder Einstufen (Scoring) | **teilweise** — eine Bonitätseinschätzung wird erfasst und Leads werden automatisch als „qualifiziert" eingestuft. Die Bewertung selbst erfolgt jedoch außerhalb des Systems durch die Bank. |
| 2 | Automatisierte Entscheidung mit Rechtswirkung | nein |
| 3 | Systematische Überwachung | nein — die Zugriffsprotokollierung dient der Sicherheit, nicht der Verhaltenskontrolle |
| 4 | Vertrauliche oder höchstpersönliche Daten | **ja** — Einkommensnachweise, Steuerbescheide und Ausweisdokumente |
| 5 | **Verarbeitung in großem Umfang** | **nein** — die Estera GmbH ist ein regional tätiger Immobilienmakler mit einem überschaubaren Kundenkreis und einem einstelligen bis niedrig zweistelligen Beraterteam. Die erwartete Größenordnung liegt deutlich unterhalb dessen, was als „umfangreich" gilt. Maßgeblich sind die Zahlen in Abschnitt 1. |
| 6 | Abgleich oder Zusammenführung von Datensätzen | nein |
| 7 | Daten schutzbedürftiger Personen | **teilweise** — Beschäftigte gelten gegenüber dem Arbeitgeber als schutzbedürftig; die Verarbeitung beschränkt sich jedoch auf übliche Vertriebs- und Abrechnungsdaten |
| 8 | Innovative Technologien | nein — Standard-Webanwendung, keine KI-gestützte Bewertung |
| 9 | Betroffene werden an der Rechtsausübung gehindert | nein — Auskunft ist durch das Zugriffsprotokoll erstmals vollständig möglich |

**Zählung:** Ein Kriterium klar erfüllt (Nr. 4), zwei teilweise (Nr. 1 und 7).

---

## 4. Abwägung und Ergebnis

**Was für eine Folgenabschätzung spricht:** Die Datenarten sind sensibel.
Ausweiskopien in Verbindung mit vollständigen Einkommensnachweisen sind ein
Datensatz, mit dem im Missbrauchsfall Identitätsdiebstahl möglich wäre. Rechnet
man die teilweise erfüllten Kriterien mit, wäre die Faustregel von zwei
Kriterien erreicht.

**Was dagegen spricht — und hier ausschlaggebend ist:** Der Umfang. Die
Kriterien des EDSA sind ausdrücklich im Zusammenspiel mit der Verarbeitungs-
größe zu lesen. Bei einem regional tätigen Maklerbetrieb mit einem
überschaubaren Kundenkreis und einem kleinen, klar abgegrenzten Zugriffskreis
fehlt es an dem Breitenrisiko, das eine Folgenabschätzung adressieren soll.

Hinzu kommt, dass die technischen Maßnahmen bereits über dem branchenüblichen
Standard liegen und am 26.07.2026 wirksam geprüft wurden — insbesondere die
lückenlose Protokollierung jedes Dokumentzugriffs, die auf 60 Sekunden
begrenzten Download-Links, die technisch in der Datenbank erzwungene
Mandantentrennung und die einzeln erteilte, jederzeit widerrufbare Freigabe an
Finanzierungspartner. Diese Maßnahmen senken das Risiko für die betroffenen
Personen erheblich und fließen nach Art. 35 Abs. 1 in die Bewertung ein.

### Ergebnis

**Eine Datenschutz-Folgenabschätzung wird derzeit als nicht erforderlich
bewertet.** Die Prüfung ist mit diesem Dokument dokumentiert.

**Folgerung für den Datenschutzbeauftragten:** Da keine Folgenabschätzung
erforderlich ist und weniger als 20 Personen ständig automatisiert
personenbezogene Daten verarbeiten, besteht auch keine Pflicht zur Benennung
eines Datenschutzbeauftragten (§ 38 Abs. 1 BDSG).

---

## 5. Wiedervorlage — wann diese Bewertung neu zu treffen ist

Die Bewertung hängt maßgeblich am Umfang. Sie ist **zwingend neu zu prüfen**, wenn:

- die Zahl der erfassten Kunden **1.000 deutlich überschreitet**,
- der Kreis der Zugriffsberechtigten **20 Personen erreicht** (dann ohnehin
  Pflicht zur Benennung eines Datenschutzbeauftragten),
- eine **automatisierte Bonitätsbewertung oder Scoring** im System selbst
  eingeführt wird,
- **besondere Datenkategorien nach Art. 9** hinzukommen (z. B. Gesundheitsdaten
  bei Versicherungsprodukten — bei Vermögensverwaltungs- und Policengeschäft
  durchaus denkbar),
- die Verarbeitung in ein **Drittland** verlagert wird.

Der vierte Punkt verdient besondere Aufmerksamkeit: Sobald im Bereich
Vermögensverwaltung Gesundheitsangaben erfasst werden, greift Art. 35 Abs. 3
lit. b und die Bewertung kippt.

**Nächste turnusmäßige Prüfung:** 26.07.2027

---

## 6. Bestätigung am realen Datenbestand

Die Erstbewertung erfolgte vor Aufnahme der Verarbeitung und stützt sich auf die
in Abschnitt 1 genannte erwartete Größenordnung. Vier Wochen nach dem
Produktivstart wird sie anhand der tatsächlich erfassten Zahlen überprüft.

**Auszufüllen bei der Nachprüfung:**

| Kennzahl | Tatsächlicher Wert | Stichtag |
|---|---|---|
| Erfasste Interessenten und Kunden | `_______` | `__________` |
| Erfasste Kundendokumente | `_______` | |
| Aktive Nutzerkonten | `_______` | |

**Ergebnis der Nachprüfung** (Zutreffendes ankreuzen):

`☐` Die Erstbewertung wird **bestätigt**. Die tatsächliche Größenordnung
entspricht der Erwartung; eine Datenschutz-Folgenabschätzung ist weiterhin
nicht erforderlich.

`☐` Die Erstbewertung wird **angepasst**. Begründung:
`________________________________________________________________`

Durchgeführt am `__________` durch `______________________________`

> **Hinweis:** Sollten die tatsächlichen Zahlen die Erwartung deutlich
> übersteigen, greifen die in Abschnitt 5 genannten Schwellen. Die Bewertung
> ist dann neu zu treffen — nicht nur zu bestätigen.

---

**Erstellt:** 26.07.2026 vom technischen Dienstleister
**Geprüft und bestätigt:** `[Anwalt / DSB — Name, Datum, Unterschrift]`
**Freigegeben:** `[Geschäftsführung — Name, Datum, Unterschrift]`
**Nachgeprüft:** `[Datum, Name — vier Wochen nach Produktivstart]`
