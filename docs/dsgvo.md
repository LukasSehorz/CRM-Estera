# DSGVO — Technische Maßnahmen, Nachweise & offene Punkte

Stand: 26.07.2026 · Gilt für das Estera CRM (Next.js auf Netlify, Supabase EU)

Dieses Dokument hat zwei Zwecke: es ist die **Beschreibung der technischen
Maßnahmen (TOM) nach Art. 32 DSGVO** für die Übergabe an den Mandanten, und es
hält fest, **was noch offen ist** — technisch wie organisatorisch.

> **Wichtige Einordnung:** Dieses Dokument beschreibt den technischen Zustand
> und dessen Prüfung. Es ist **keine Rechtsberatung** und ersetzt keine
> Bewertung durch einen Datenschutzbeauftragten oder Anwalt. Die
> organisatorischen Pflichten (Abschnitt 4) kann nur der Verantwortliche
> erfüllen — ohne sie ist das System trotz sauberer Technik nicht konform.

---

## 1. Welche Daten werden verarbeitet?

| Kategorie | Felder / Inhalte | Sensibilität |
|---|---|---|
| Kontaktdaten | Vor-/Nachname, E-Mail, Telefon | normal |
| Finanzdaten | Nettoverdienst, Eigenkapital, Finanzierungsrahmen, Einschätzung | **hoch** |
| Kundendokumente | Personalausweis/Reisepass, Aufenthaltstitel, Gehaltsnachweise, Steuerbescheide, Kapitalnachweise | **sehr hoch** |
| Deal-/Objektdaten | Objektadresse, Kaufpreis, Notartermin, Bemerkungen | intern |
| Mitarbeiterdaten | Name, Rolle, Provisionsstufe, Struktur-Anbindung, Ziele | intern |

Ausweisdokumente und Einkommensnachweise sind der kritische Teil. Für sie
gelten die schärfsten Maßnahmen (Abschnitt 2.3 und 2.4).

---

## 2. Umgesetzte technische Maßnahmen

### 2.1 Zugriffskontrolle (Art. 32 Abs. 1 lit. b)

Durchgesetzt in **Postgres Row Level Security**, nicht im Frontend. Die
Oberfläche filtert nur zur Bequemlichkeit — die verbindliche Grenze liegt in
der Datenbank und gilt auch bei direktem API-Zugriff.

| Rolle | Sichtbarkeit |
|---|---|
| `berater` | ausschließlich eigene Kontakte, Deals und Dokumente |
| `berater` (mit Downline) | zusätzlich **Deals** der eigenen Struktur — **nicht** deren Kontakte oder Dokumente |
| `backoffice` | beide Sparten, keine Provisionsrechte |
| `finanzierer` | **nur** einzeln freigegebene Dokumente + zugehöriger Kundenname |
| `geschaeftsfuehrung` | alles |

Der Finanzierer (externe Bank) hat **keinen Tabellenzugriff**. Er liest
ausschließlich über zwei streng gefilterte `SECURITY DEFINER`-Funktionen
(`finanzierer_kunden`, `finanzierer_dokumente`), die sich selbst auf den
Aufrufer beschränken. Damit ist ausgeschlossen, dass er über einen
API-Parameter mehr sieht als vorgesehen.

**Geprüft am 26.07.2026** gegen die Produktivdatenbank mit einem eigens
angelegten Testkonto (danach entfernt). Der Datenbestand zum Prüfzeitpunkt
bestand ausschließlich aus **Testdaten** — es waren zu keinem Zeitpunkt echte
Kundendaten im System, auch nicht während der Prüfung:

- Testberater sah **0 von 53** Testkontakten und **0** fremde Dokumente
- Anonymer Zugriff (ohne Anmeldung) auf alle 17 Tabellen: **HTTP 401**
- Selbst-Hochstufung auf `geschaeftsfuehrung` per API: **abgewiesen (403)**
- Rollenwechsel/Kontosperre als Berater per RPC: **abgewiesen (400)**

### 2.2 Speicherung der Dokumente

- Zwei **private** Storage-Buckets (`kundendokumente`, `vorlagen`) — kein
  öffentlicher Lesezugriff, Auflisten für Unangemeldete verweigert.
- Zugriff auf die Dateien über dieselben RLS-Regeln wie die Metadaten.
- Downloads laufen über **signierte Links mit 60 Sekunden Gültigkeit**
  (ZIP-Export 120 s). Ein weitergegebener Link ist nach einer Minute wertlos.
- Speicherpfad enthält **keine Klarnamen**: `<contact-uuid>/<zufalls-uuid>_<datei>`.
- Verschlüsselung bei Übertragung (TLS) und im Ruhezustand (Supabase/AWS).

### 2.3 Upload-Härtung *(neu — Migration/Code 07/2026)*

- **Positivliste erlaubter Dateitypen**: PDF, Bilder (JPG, PNG, HEIC, TIFF …)
  und Office-Dokumente. Ausführbare und aktive Formate (HTML, SVG, JS) werden
  abgewiesen.
- Der **Content-Type wird serverseitig aus der Dateiendung abgeleitet**, nicht
  mehr vom Browser übernommen. Vorher war er fälschbar — eine als Bild getarnte
  HTML-Datei wäre beim Öffnen im Browser ausgeführt worden.
- Größenbegrenzung 15 MB (Kundenakte) bzw. 25 MB (Portal).

### 2.4 Zugriffsprotokoll *(neu)*

Tabelle `dokument_zugriff_log`. Protokolliert für jedes Kundendokument:
**wer, wann, welche Aktion** (`upload`, `download`, `delete`, `zip_export`,
`freigabe_erteilt`, `freigabe_entzogen`) — nur Metadaten, nie Inhalte.

Manipulationssicher aufgebaut:

- Einträge entstehen **ausschließlich** über die `SECURITY DEFINER`-Funktion
  `log_dokument_zugriff`. Sie trägt immer den angemeldeten Nutzer ein — ein
  übergebener Wert wird ignoriert. Niemand kann sich als jemand anderes
  protokollieren.
- `authenticated` hat auf der Tabelle **nur SELECT** — kein INSERT, UPDATE,
  DELETE, kein TRUNCATE. Auch der Protokollierte kann seine Spur nicht löschen.
- Lesen nur `geschaeftsfuehrung`.
- Kein Fremdschlüssel auf das Dokument: das Protokoll **überlebt die Löschung**
  des Dokuments — sonst wäre gerade der Löschvorgang nicht mehr nachweisbar.
- Ein Protokollfehler blockiert nie den fachlichen Vorgang.

Damit sind Auskunftsersuchen (Art. 15) und eine Meldung nach Art. 33
überhaupt erst beantwortbar.

### 2.5 Löschung *(korrigiert)*

Beim Löschen eines Kunden werden jetzt **zuerst die Dateien im Storage**
gelöscht, dann der Datensatz. Vorher blieben Ausweiskopien und
Einkommensnachweise unbefristet und unauffindbar im Speicher zurück (Verstoß
gegen Art. 17). Schlägt das Löschen der Dateien fehl, bleibt der Kunde bestehen
und der Vorgang ist wiederholbar — es entstehen keine unauffindbaren Reste.

> Prüfung am 26.07.2026: **0 verwaiste Dateien** im Bucket (12 Testdateien
> gesamt, alle zugeordnet). Der Fehler hatte sich noch nicht ausgewirkt und
> wurde vor der Aufnahme des Echtbetriebs behoben.

**Automatische Löschung nach Fristen ist bewusst NICHT umgesetzt** — siehe
Abschnitt 4.1.

### 2.6 Leaver-Prozess *(neu)*

Das Feld `aktiv` existierte, wurde aber nirgends geprüft: ein ausgeschiedener
Berater behielt vollen Zugriff auf seine Kundenakten. Jetzt:

- `aktiv` wird in **18 RLS-Policies** erzwungen (Kontakte, Deals, Dokumente,
  Storage-Dateien, Tippgeber) sowie in den Finanzierer-RPCs.
- Die Layouts melden ein gesperrtes Konto beim nächsten Aufruf ab und zeigen
  einen Hinweis auf der Anmeldeseite.
- Bedienbar über ein Schloss-Symbol in der Team-Verwaltung (nur GF, nicht für
  das eigene Konto, nicht für die Geschäftsführung).
- **Es werden keine Daten gelöscht** — die Kundenakten bleiben der GF
  erhalten (Nachvollziehbarkeit + Aufbewahrungspflichten).

### 2.7 Rechte-Hygiene *(neu — vorbestehender Befund)*

Supabase vergibt über ein Default-Privileg auf das Schema `public` automatisch
`TRUNCATE`, `TRIGGER` und `REFERENCES` an `anon` **und** `authenticated` — auf
jede Tabelle. Betroffen waren alle 17 Tabellen.

**TRUNCATE umgeht Row Level Security vollständig.** Über die normale
Schnittstelle (PostgREST) war das nicht auslösbar, das Risiko war also kein
offener Zugang — aber ein zu weit gefasstes Recht, das bei jeder Erweiterung
scharf geworden wäre, und auf dem Zugriffsprotokoll hätte es dessen Zweck
ausgehebelt.

Entzogen für Bestand **und** künftige Tabellen (Default-Privilegien geändert).
`anon` hat jetzt auf keiner Tabelle im Schema `public` irgendein Recht.
Verbleibende Rechte: ausschließlich SELECT/INSERT/UPDATE/DELETE nach Bedarf.

### 2.8 Rollenvergabe

Rollenwechsel und Kontosperre laufen über `SECURITY DEFINER`-Funktionen
(`set_berater_rolle`, `set_berater_aktiv`) — die **Datenbank** prüft die
Berechtigung. Vorher lief der Rollenwechsel über den Service-Role-Key mit
reiner App-Prüfung; ein Logikfehler dort hätte zur Rechteausweitung gereicht.
Die GF-Rolle kann über keinen dieser Wege vergeben oder entzogen werden.

Die `profiles`-Tabelle hat **keine UPDATE-Policy** — Selbst-Hochstufung ist
strukturell ausgeschlossen.

### 2.9 Transportsicherheit & Browser-Härtung *(neu)*

| Header | Wert | Zweck |
|---|---|---|
| `Strict-Transport-Security` | 1 Jahr, includeSubDomains, preload | erzwingt HTTPS |
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | verhindert Typ-Raten des Browsers |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | keine internen URLs an Dritte |
| `Permissions-Policy` | Kamera/Mikro/Standort aus | Angriffsfläche |

### 2.10 Weitere Maßnahmen

- **Keine öffentlichen API-Routen** — die Anwendung arbeitet ausschließlich mit
  Server Actions. Sehr kleine Angriffsfläche.
- **Kein Self-Signup** — Zugänge legt ausschließlich die GF bzw. die Upline an.
- **Keine Secrets im Repository** — `.env.local` war nie eingecheckt
  (Git-Historie geprüft).
- Anmeldefehler nennen nie, ob die E-Mail existiert.

---

## 3. Speicherort und Auftragsverarbeiter

| Dienst | Zweck | Ort |
|---|---|---|
| Supabase (Datenbank + Storage) | alle Daten, alle Dokumente | **AWS eu-central-1, Frankfurt** ✅ |
| Netlify (Anwendung) | Auslieferung, Server Actions | **Functions-Region `fra`, Frankfurt** ✅ |

Beide Dienste sind fest auf Frankfurt eingestellt; Verarbeitung und Speicherung
finden in der EU statt. Netlify Inc. ist ein US-Unternehmen — ein etwaiger
Support-Zugriff ist über die Zertifizierung nach dem **EU-US Data Privacy
Framework** (Angemessenheitsbeschluss vom 10.07.2023) sowie ergänzend über
**Standardvertragsklauseln** nach Beschluss 2021/914 abgesichert.

---

## 4. Offene Punkte

### 4.1 Löschfristen — Entscheidung des Mandanten erforderlich 🔴

Aktuell wird **nichts automatisch gelöscht**. Das ist der bewusst sichere
Zustand: eine Automatik könnte Unterlagen entfernen, die im laufenden
Finanzierungsprozess noch gebraucht werden.

Zu klären ist **eine Frage**:

> Wie lange werden Kundendokumente nach Abschluss bzw. Absage eines Deals
> aufbewahrt — und unterliegt Estera der Aufzeichnungspflicht nach § 8 GwG?

Hintergrund: Art. 17 DSGVO verlangt Löschung, wenn der Zweck entfällt. Bei
Immobilien-Kapitalanlagen greift jedoch oft das **Geldwäschegesetz**, das für
Ausweiskopien eine **fünfjährige Aufbewahrung** vorschreibt. Aufbewahrungs-
pflicht geht der Löschpflicht vor — aber ob sie hier greift, muss ein Anwalt
für den konkreten Fall feststellen.

Sobald die Fristen feststehen, ist die Umsetzung eine Konfiguration, kein Umbau.

### 4.2 Hosting-Region der Anwendung ✅ *(erledigt)*

Ursprünglicher Befund: In `netlify.toml` war keine Region festgelegt —
Netlify-Functions laufen dann standardmäßig in `us-east-1` (USA), und die
Server Actions hätten dort Kundendaten im Klartext verarbeitet. Das wäre ein
Drittlandtransfer nach Art. 44 ff. gewesen und hätte den EU-Standort der
Datenbank weitgehend entwertet.

**Umgesetzt:** Die Functions-Region ist auf **`fra` (Frankfurt)** festgelegt
— einstellbar über *Project configuration → Build & deploy → Continuous
deployment → Functions region*. Diese projektweite Einstellung ist bei Next.js
zwingend, weil die Functions erst zur Build-Zeit erzeugt werden und daher keine
Region im Code tragen können. Voraussetzung ist mindestens der Pro-Tarif.

Ein Anbieterwechsel ist damit **nicht erforderlich**. Netlify Inc. ist nach dem
EU-US Data Privacy Framework zertifiziert; seit dem Angemessenheitsbeschluss
vom 10.07.2023 sind Übermittlungen an zertifizierte US-Unternehmen ohne
zusätzliche Garantien zulässig. Ergänzend gelten die Standardvertragsklauseln
nach Beschluss 2021/914.

> **Restrisiko, bewusst benannt:** Der Data Privacy Framework steht — wie zuvor
> Safe Harbor und Privacy Shield — unter juristischer Beobachtung. Sollte er
> fallen, greifen die Standardvertragsklauseln weiter; durch die Region
> Frankfurt bleiben Verarbeitung und Speicherung ohnehin in der EU. Bei einem
> Wechsel des Hosting-Anbieters ist dieser Abschnitt neu zu bewerten.

### 4.3 Organisatorische Pflichten — nur der Verantwortliche kann sie erfüllen 🟡

Ohne diese Punkte ist das System **nicht konform**, egal wie gut die Technik ist:

- [ ] **AVV nach Art. 28** mit Supabase **und** Netlify
- [ ] **Verzeichnis von Verarbeitungstätigkeiten** (Art. 30) — Abschnitt 1 ist die Vorlage
- [ ] **TOM-Dokumentation** (Art. 32) — Abschnitt 2 ist die Vorlage
- [ ] **Datenschutz-Folgenabschätzung** (Art. 35) — bei Ausweiskopien plus Bonitätsdaten in diesem Umfang mit hoher Wahrscheinlichkeit pflichtig
- [ ] **Datenschutzhinweise + Rechtsgrundlage** für die Lead-Daten (Art. 6, 13/14) — woher stammen die Leads?
- [ ] **Rechtsgrundlage für die Finanzierer-Freigabe**: Die Bank ist eigener Verantwortlicher. Für die Übermittlung braucht es eine Rechtsgrundlage bzw. Einwilligung des Kunden — im CRM derzeit nicht erfasst.
- [ ] **Löschkonzept schriftlich** (siehe 4.1)
- [ ] **Meldeprozess für Datenpannen** (Art. 33: 72 Stunden) — wer meldet an wen?
- [ ] **Verpflichtung der Mitarbeiter** auf Datengeheimnis

### 4.4 Technisch möglich, aber mit spürbarer Änderung — Freigabe erforderlich 🟡

Bewusst **nicht** umgesetzt, weil es Arbeitsabläufe verändert:

| Punkt | Was sich ändern würde | Empfehlung |
|---|---|---|
| **Zwei-Faktor-Authentifizierung** | zusätzlicher Code beim Anmelden | dringend empfohlen bei Ausweisdokumenten |
| **Passwortwechsel beim ersten Login** | Nutzer muss beim ersten Anmelden ein eigenes Passwort setzen | dringend empfohlen — aktuell kennt der Anleger dauerhaft das Passwort, damit ist keine Handlung einer Person zurechenbar |
| **Protokoll-Ansicht für die GF** | neuer Menüpunkt | ohne sie ist das Protokoll nur per Datenbankabfrage lesbar |
| **Dealname für die Upline pseudonymisieren** | Upline sähe statt des Kundennamens eine Kennung | siehe 4.5 |
| **Content-Security-Policy** | keine sichtbare Änderung, aber Risiko von Darstellungsfehlern — braucht einen Testlauf | empfohlen als nächster Schritt |

### 4.5 Sichtbarkeit in der Struktur 🟡

Ein Upline-Partner sieht die **kompletten Deal-Zeilen** seiner gesamten
Downline — einschließlich `dealname` (in der Praxis der Kundenname),
`objekt_adresse`, `kaufpreis` und `bemerkungen`. Kontakte und Dokumente der
Downline sieht er **nicht**.

Für die Provisionsabrechnung ist das gewollt. Für die DSGVO braucht es dafür
eine dokumentierte Erforderlichkeit (Zweckbindung, Datenminimierung) — oder
die Anzeige wird pseudonymisiert. Bitte mit dem Mandanten entscheiden und in
Abschnitt 1 des Verarbeitungsverzeichnisses festhalten.

---

## 5. Checkliste vor der Übergabe

- [ ] Löschfristen geklärt (4.1) und umgesetzt
- [x] Hosting-Region auf Frankfurt festgelegt (4.2) — erledigt
- [ ] AVV mit allen Auftragsverarbeitern abgeschlossen
- [ ] **Alle Demo-Zugänge entfernt** — die aktuellen Demo-Logins nutzen ein
      gemeinsam bekanntes Passwort
- [ ] **Alle Schlüssel rotiert** — Supabase Anon-Key, Service-Role-Key,
      Datenbank-Passwort
- [ ] Eigene Entwickler-Zugänge entfernt
- [ ] Deployment und Repository auf Estera-Accounts übertragen
- [ ] Produktive Passwörter vergeben, 2FA entschieden (4.4)
- [ ] Backup- und Wiederherstellungsprozess dokumentiert und **einmal getestet**

---

## 6. Prüfprotokoll

Die technischen Maßnahmen wurden am **26.07.2026** gegen die Produktivdatenbank
geprüft. Alle Prüfungen bestanden:

| Prüfung | Ergebnis |
|---|---|
| Anonymer Zugriff auf alle 17 Tabellen | abgewiesen (HTTP 401) |
| Storage-Buckets öffentlich auflistbar | nein |
| Mandantentrennung (Testberater vs. 53 Testkontakte) | 0 fremde Kontakte, 0 fremde Dokumente |
| Protokoll schreibbar mit korrektem Akteur | ja |
| Protokoll durch Berater lesbar | nein |
| Protokoll durch Berater löschbar | nein (HTTP 403) |
| Selbst-Hochstufung auf GF | abgewiesen (HTTP 403) |
| Rollenwechsel/Sperre per RPC als Berater | abgewiesen (HTTP 400) |
| Gesperrtes Konto: Datenzugriff | 0 Zeilen |
| Gesperrter Finanzierer: Kundenliste | 0 Zeilen (aktiv: 1) |
| TRUNCATE als `authenticated` | abgewiesen |
| RLS auf allen Tabellen im Schema `public` | aktiv |
| Verwaiste Dateien im Dokumenten-Bucket | 0 |

> **Zum Datenbestand:** Sämtliche Prüfungen liefen gegen **Testdaten**. Vor der
> Übergabe wurde das System vollständig geleert (0 Kontakte, 0 Dokumente,
> 0 Dateien im Speicher); die Testzugänge wurden entfernt. Echte Kundendaten
> waren zu keinem Zeitpunkt im System.

Nachvollziehbar über die Migrationen `0032`–`0034`.
