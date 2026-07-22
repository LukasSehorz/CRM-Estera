# Umsetzungsplan — Kunden-Call 2 (Sebastian Meilbeck, 21.07.2026)

Quelle: Zoom-Aufnahme `2026-07-21 16.17.00 Zoom Meeting von Sebastian Meilbeck`
(~55 Min; substanziell 00:00–45:41, danach Recording-Leerlauf). Transkript +
Frames unter dem Watch-Arbeitsordner im Scratchpad. Zeitstempel [MM:SS]
verweisen auf die Aufnahme.

Tenor des Kunden: „Nur noch Fine-Tuning, keine großen Änderungen mehr." — stimmt
für die meisten Punkte; **Academy** und **digitale Partner-Anbindung** sind
aber echte neue Module (bewusst als Zukunft markiert).

Legende: 🔴 Bug/Muss · 🟢 klar umsetzbar · 🟡 klar mit Interpretation ·
🔵 großes Feature · ❓ Kunden-/Design-Entscheidung offen · ⚪ organisatorisch
(kein Code) · ✅ im Call als erledigt bestätigt.

---

## A. Bugs / Muss-Fixes

### A1 · Dokumenten-Upload speichert nicht 🔴 [27:19, 29:39, 33:23]
Lukas hat es im Call LIVE getestet — „ich habe das vorhin schon angepasst, aber
irgendwie speichert es die nicht". Der Upload funktioniert also **weiterhin
nicht** (die Fehlermeldungs-Verbesserung aus Runde 1 hat das eigentliche
Speichern nicht gelöst). Kunde: „Dokumente bitte fixen, dass man es auch hier
einfügen kann." Höchste Priorität.
- **Tun:** Upload live reproduzieren (echten Storage-/Insert-Fehler jetzt im
  Toast sichtbar), Ursache beheben. Kandidaten aus Runde 1: RLS-Insert-Policy
  (Kontakt-Owner-Mismatch), Storage-Bucket in der genutzten Instanz, Dateigröße.
  Frame [28:52] zeigt die Checkliste mit „Anhängen".

### A2 · App/Team-Verwaltung lädt zu langsam 🟢 [04:17]
„Ich muss das auch noch fixen, dass das nicht mehr so lange lädt. Das geht
normal viel schneller alles." Besonders Team-Verwaltung.
- **Tun:** Ladezeiten der schweren Seiten prüfen (Server-Queries/N+1, unnötige
  Full-Loads), optimieren.

---

## B. Kleine Fine-Tunings (Labels / Anzeige)

### B1 · „Immo-Anteil" → „Provisionsanteil" umbenennen 🟢 [24:05–24:15]
Kunde: „Was ist denn Immo-Anteil? Das macht ja keinen Sinn. Das wäre dann
Provisionsanteil." Betrifft Team-Verwaltung (GF-Formular + Berater-Sub-Formular,
Slider-Label + Hinweistext). Frame [24:05] zeigt „Immo-Anteil — 7 %".

### B2 · VV-Umsatz-Anzeige „3.744 von 50.000" + 7 % ist zweideutig 🟢 [44:11–45:41]
In der Berater-Ansicht Vermögensverwaltung stand „3.744 von 50.000" und daneben
„7 %". Kunde war irritiert (dachte, 3.744 sei irgendwas × 7 %). Tatsächlich:
3.744 = erwirtschafteter Umsatz gegen Monatsziel 50.000, und 7 % = Provisions-
satz. „Das ist ein bisschen zweideutig dargestellt. Das kann man deutlich
machen."
- **Tun:** Umsatz-vs-Ziel und Provisionssatz klar trennen/beschriften.

### B3 · Overhead-Detail: Volumen (Kaufpreis) klar zeigen 🟡 [15:39–16:41]
Beim Overhead-Aufschlüsseln (Partner-Ansicht, „woraus er sich zusammensetzt")
wollte der Kunde das **Volumen (Kaufpreis)** sehen, nicht nur die Provision.
Frame [14:26] zeigt bereits „Kaufpreis 560.000 € × 7 % …" — also teils schon
da. Gespräch endete bei „Abschluss ist wichtiger als Volumen" + „Volumen wird
separat angezeigt (4,5 Mio)".
- **Tun:** Prüfen, dass in der Overhead-Deal-Zeile der Kaufpreis/das Volumen
  klar steht. Niedrige Priorität, evtl. schon erfüllt.

---

## C. Kleine Features

### C1 · Kunde auch OHNE Dokumente anlegbar 🟢 [28:15–28:51]
Aktuell erscheint ein Kunde erst, wenn er als Kontakt angelegt UND Dokumente
hochgeladen wurden. Kunde will: Kunde anlegen ohne Dokumente, Dokumente später
nachreichen (z. B. „8 von 10 da, 2 später nachfügen"). Sebastian: „Würde ich
machen."
- **Tun:** Kunde/Akte auch ohne Dokumente sichtbar/anlegbar; Dokumente jederzeit
  nachreichbar (Checkliste ist ja schon da, Frame [28:52]).

### C2 · Sub-Berater: Vergabe-Grenze = eigener Provisionsanteil (dynamisch) 🟡 [24:21–24:35]
„Es soll automatisch einstellbar sein, was der Kunde maximal verdient. Haben wir
ihn auf 7 % eingestellt, kann er auch max. 7 % vergeben. Sind wir bei 20 %, kann
man max. 20 % vergeben." Aktuell ist die Grenze für Berater hart auf 7 %.
- **Tun:** Die Obergrenze, die ein Berater seiner Downline vergeben kann,
  dynamisch an SEINEN eigenen Provisionsanteil koppeln (statt fixe 7). GF-Grenze
  entsprechend (deren Anteil, z. B. 10/20 %). Client-Slider-max + Server-Bounds.

### C3 · Deal-Time pro Kunde/Deal 🟡 [40:15–42:17]
Aktuell nur durchschnittliche/Overall-Deal-Time. Kunde will die Deal-Time des
EINZELNEN Kunden sehen. Datenbasis existiert (Pipeline-/Stage-Historie —
Frame [41:55] zeigt „Phasen-Verlauf" mit Dauer je Phase). Lukas: „kann ich in
der Detailansicht einfügen."
- **Tun:** Gesamt-Deal-Time je Deal in der Deal-Detailansicht ausweisen
  (Summe/Spanne über die Phasenhistorie).

### C4 · Storno-Quote detailliert / aufklappbar 🟡 [40:15–40:21]
„Kann man bei der Storno-Quote auch nochmal detailliert sehen?" — welche Deals
storniert wurden.
- **Tun:** Storno-Quote-KPI aufklappbar → Liste der stornierten Deals (analog zu
  den anderen aufklappbaren KPIs aus Runde 1).

---

## D. Mittleres Feature — Reserviert/Verbrieft-Ausbau

### D1 · Reserviert & Verbrieft deutlich ausbauen 🟡 [37:55–40:15]
Der Kunde will hier VIEL mehr Analyse (Kernsatz: „Alles, was man nicht messen
kann, kann man nicht skalieren."). Aktueller Stand: GF-Board mit Balken je
Berater (Frame [38:28]). Gewünscht:
- **a) Auch in der Berater-Ansicht** — aktuell nur GF. „Der Berater sieht es
  aktuell noch nicht, aber dann baue ich das in der Berater-Ansicht auch ein."
- **b) Zeit-Dimension / „wann"** — „Da wäre wichtig zu sehen, wann." Reserviert/
  Verbrieft pro Monat.
- **c) Balkendiagramm mit Umsatz / Reserviert / Verbrieft NEBENEINANDER je
  Berater** — „nicht nur Umsatz-pro-Berater, sondern Reserviert-pro-Berater,
  Verbrieft-pro-Berater, dass die Balken nebeneinander sind."
- **d) Umschaltbare Ansichten** — Gesamt / nur Umsatz / nur Reserviert / nur
  Verbrieft (und kombiniert). „Eine Gesamtansicht und dann einzeln."
- **e) Notar-/Storno-Analyse** — „zum Notar gebracht, alles, damit wir
  analysieren können, wenn vom Notar was abgesprungen ist." Storno-Quote mit rein.

---

## E. Große neue Module (bewusst Zukunft)

### E1 · Academy / Schulungsbereich 🔵 [31:23–33:21]
Neuer Menüpunkt links (eigenes Icon). „Idiotensicher", mehrstufig:
- **Kategorien:** Erste Schritte/Starter · Tippgeber · Immobilien ·
  Vermögensverwaltung (4 Bereiche), mit **Unterordnern**/Lektionen.
- **Erste Schritte:** 3–4 Lektionen (wie man Partner anbindet, wie das System
  funktioniert, wie man die App aufs Handy holt).
- **Rollenbasierte Sichtbarkeit** — „individuell einschalten, was jeder sieht.
  Wenn jemand nur Tippgeber ist, kriegt er nur Tippgeber."
- **~33 Videos** insgesamt; Videos existieren noch NICHT (Kunde nimmt sie später
  per Handy/Teleprompter auf und schickt sie zum Einbauen). Lukas: „easy, Icon
  einfügen, Videos hochladen, schön anrichten."
- **Tun (jetzt baubar, ohne Videos):** Academy-Modul mit Kategorie-/Lektions-
  Struktur, Video-Player, rollenbasierter Freischaltung, Platzhalter bis Videos
  kommen.

### E2 · Digitale Tippgeber-/Partner-Anbindung mit E-Signatur 🔵❓ [02:57–08:36, 20:17–21:09]
„Champions League" / „Zukunftsmusik", aber dem Kunden wichtig:
- Beim Anlegen eines Tippgebers/Partners im CRM → **externer Link/Seite** → die
  Person füllt alles digital aus (Provisions-%, persönliche Daten) → **Selbst-
  auskunft-Häkchen** (z. B. „keine laufenden Verfahren / letzte 3 Jahre nichts")
  → **E-Signatur per E-Mail** → Vertrag/Datei wird im CRM hinterlegt.
- **Partner ist erst „aktiv/angelegt", wenn unterschrieben.** „Sonst ist es
  wieder verfälscht. Wenn man sowas macht, muss es 100 % richtig sein."
- Braucht eine **Vertragsvorlage** (erstellt der Kunde: „Erstellen wir.").
- Sebastian: „Lass es mal für danach merken." → **nicht sofort**, aber
  einplanen. Lukas offen: „muss überlegen, wie man den nur anlegen kann, wenn
  das erfüllt ist." ❓ Umsetzungsweg (E-Signatur-Dienst? Eigenbau?) offen.

---

## F. Mobile

### F1 · Mobil nutzbar / „Add to Home Screen" (PWA) 🟡 [30:33–31:23]
Kunde will perspektivisch eine Handy-App. Realistisch kurzfristig: responsive
Feinschliff + Website als **PWA** aufs Handy („über Home Screen den Link
reinmachen"). Echte App-Store-App = organisatorischer Aufwand (Account,
Genehmigung) → später.
- **Tun (kurzfristig):** Mobile-Layout der Kernseiten prüfen/polieren, PWA-
  Manifest + Home-Screen-Installierbarkeit.

---

## G. Branding

### G1 · Logo/Icon ersetzen (neues Logo statt altem „E") 🟢⚪ [33:27–33:49]
„Unser Icon, das E ist alt. Habt ihr kein Logo mehr? Das ist ausgeschrieben."
Kunde schickt das neue (ausgeschriebene) Logo/Bild. Frame [Login] zeigt das
aktuelle „E".
- **Tun:** Neues Logo einbauen (Sidebar, Login, Favicon), sobald geliefert.

---

## H. Offen — Entscheidungen / später klären

### H1 · Monatsziele — wer legt sie fest? ❓ [11:29–13:11]
Partner selbst vs. von der Upline/GF vorgegeben. Sebastian: „zweitrangig,
erstmal so lassen" (aktuell editieren die Partner selbst). → Keine Aktion jetzt,
intern mit Kunde final abstimmen.

### H2 · Bestandskunden in Masse anlegen (VV) ❓ [26:41–27:03]
„Was, wenn wir 100 Bestandskunden in der VV haben und die jetzt anlegen?" —
im Call auf „Deals anlegen" verschoben, nicht final geklärt. → Bulk-/Schnell-
Anlage klären (Import?).

### H3 · Provision pro Deal abweichend darstellen ❓ [16:41–19:27]
Fall: Partner hat Standard 8 %, bekommt bei EINEM Deal (wo er Hilfe brauchte)
nur 5 % → „3 % abgezogen". Wie sauber darstellen? Provisionssatz ist schon pro
Deal setzbar (Frame [41:55] „Provisionssatz 12"), aber die Logik „Standard des
Beraters vs. deal-spezifische Abweichung/Abzug" braucht eine klare Darstellung.
Lukas offen: „Ich stelle die Frage nochmal, wie wir es am besten darstellen."
→ Design festlegen (z. B. Standard-% am Berater + optionaler Deal-Override mit
Differenz-Anzeige).

### H4 · „Übersichten"-Menüpunkt ⚪ [37:01–37:35]
Lukas unsicher über den Zweck, lässt ihn drin („eher useless, aber drin
lassen"). Gibt Partner-Daten/Performance. → Bei Gelegenheit klären/beschriften
oder entfernen.

---

## I. Organisatorisch (kein CRM-Code)

- **I1 · DSGVO / deutscher Server** [10:33–11:14] — final prüfen/bestätigen, dass
  Supabase in EU/DE-Region läuft. Lukas: „muss ich final checken."
- **I2 · Übergabe / Zugriff / NDA** [34:35–36:11] — bei Übergabe Supabase-Passwort
  ändern (nur Kunde hat Zugriff), Dev nur mit Zugangsdaten; Code aushändigen +
  vom Laptop löschen; **NDA** unterschreiben lassen.
- **I3 · Storage-Kapazität** [29:45–30:33] — Plan für 30 Partner × 10–20 Kunden ×
  10 Dokumente; ggf. auf bezahlten Supabase-Tier wechseln, überwachen.
- **I4 · Academy-Videos** — Kunde nimmt ~33 Videos auf, schickt sie zum Einbauen.
- **I5 · Vertragsvorlage** (für E1) — Kunde erstellt die Tippgeber-Vertragsvorlage.

---

## J. Im Call bestätigt: bereits erledigt ✅

Zur Absicherung — diese Runde-1-Punkte hat der Kunde im Call als vorhanden/ok
gesehen:
- Aufgaben + Monatsziele nach oben, überfällige zuerst [11:29, 25:39]
- Nur-Immobilien-Ansicht greift [13:11–13:29]
- Berater-Performance aufklappbar, Deals nachvollziehbar [13:49–13:57]
- Overhead je Partner getrennt ausgewiesen [14:19–15:39]
- Provisionssatz nur GF, Berater können ihn NICHT selbst setzen [18:09, 21:11]
- Immo-Anteil Regler Berater 1–7 / GF 1–10 [23:47–23:57]
- Sub-Berater nur in eigenen Sparten anlegbar [24:35–25:09]
- „Eingeschätzte Kunden": Spalte + „Objekt frei" entfernt [25:19–25:29]
- Kontakt → „Kunden" umbenannt [26:19]
- Interessent / Pipeline / Bestandskunde-Definition [27:03–27:13]
- Dokumente-Checkliste-Ansicht (ganze Checkliste, nicht nur Uploads) [28:51]
- „Reservierungsformular" entfernt (nur „Reservierungsvereinbarung", Frame 28:52)

---

## Vorschlag Reihenfolge

1. **Sofort (Bugs):** A1 Upload-Fix, A2 Ladezeiten.
2. **Quick-Wins (Labels/klein):** B1 Umbenennung, B2 VV-Anzeige, C1 Kunde ohne
   Doks, C2 dynamische Vergabe-Grenze, C4 Storno-Detail, B3 Overhead-Volumen.
3. **Mittel:** C3 Deal-Time je Deal, D1 Reserviert/Verbrieft-Ausbau.
4. **Groß (nach Freigabe/Assets):** E1 Academy (Struktur jetzt, Videos später),
   F1 PWA/Mobile, G1 Logo (nach Lieferung).
5. **Zukunft/Design:** E2 E-Signatur, H3 Deal-Provisions-Abweichung.
6. **Organisatorisch:** I1–I5 parallel.
