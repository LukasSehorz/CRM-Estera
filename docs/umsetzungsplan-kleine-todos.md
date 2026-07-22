# Umsetzungsplan — Kleine To-dos (Kunden-Feedback)

_Stand: 22.07.2026 · betrifft 3 neue Anpassungen + Logo-Tausch_

Dieses Dokument beschreibt **was** ich umsetze und **wie**. An den mit
**❓ ENTSCHEIDUNG** markierten Stellen brauche ich vorab deine Antwort, weil
das die Umsetzung grundlegend verändert. Meine jeweilige **Empfehlung** ist
angegeben.

---

## 0. Logo-Tausch ✅ (bereits erledigt)

- Aus der Kunden-Wortmarke (`Bilder/Logo Estera.jpeg`) habe ich erzeugt:
  - `public/estera-icon.png` — quadratisches App-Icon (Navy-Fläche + helles
    Serifen-„E"). Genutzt für **Sidebar oben-links**, **Favicon**, **Login-
    Formular-Kachel**. Selbsttragend → funktioniert auf hellen wie dunklen
    Flächen.
  - `public/estera-wordmark-light.png` — volle Wortmarke „ESTERA" in Off-White
    für das **große Login-Logo** (Login ist immer dunkel).
  - `public/estera-wordmark.png` — Wortmarke in Navy (Reserve für helle Flächen).
- Zentral über `src/config/branding.ts` (White-Label bleibt eine Stelle).
- Das alte Gold-„E"-Monogramm wird nicht mehr referenziert.
- Live geprüft (Login + Sidebar). **Falls die Behandlung anders gewünscht ist**
  (z. B. Gold statt Off-White, oder Wortmarke auch in der Sidebar statt Icon),
  bitte kurz sagen — schnell anpassbar.

---

## 1. Ziele: Selbst-Einstellen weg, nur „von oben" setzbar

### Verständnis
Kein Berater darf sich sein Monatsziel **selbst** setzen. Ziele werden **von
oben** vergeben: Die Geschäftsführung kann für alle setzen, und ein Berater mit
eigener Struktur kann die Ziele **für seine Downline** (die Berater unter ihm)
setzen.

### Ist-Zustand (Code)
- Tabelle `berater_monatsziele` (`monatsziel_immobilien`, `monatsziel_vv`,
  `gesperrt`) — `supabase/migrations/0009_monatsziele.sql`, `0011_v4_kern.sql`.
- **Berater setzt sein Ziel heute SELBST**: Funktion `set_eigenes_monatsziel()`
  (`0011:166`) + UI `dashboard/ziel-block.tsx` (`ZielEditor`) → Server-Action
  `setEigenesMonatsziel()` (`(dashboard)/actions.ts:20`).
- GF setzt in der Team-Verwaltung via `setMonatsziele()` (`team/actions.ts:78`).
- „Sperre" (`set_monatsziel_sperre`, GF) friert das Ziel ein.
- Hierarchie: `profiles.parent_berater_id` + Funktion `is_ancestor(a, b)`
  (`0018_mehrebenen_struktur.sql:10`).

### Soll / Umsetzung
1. **DB — neue Funktion** `set_monatsziel_fuer(p_target, p_immo, p_vv)`
   (SECURITY DEFINER), Migration `00xx_ziele_von_oben.sql`:
   - Erlaubt nur, wenn Aufrufer **GF** ist **oder** `is_ancestor(auth.uid(),
     p_target)` = true (Ziel liegt echt in der eigenen Downline).
   - **Verbietet** `p_target = auth.uid()` → man kann sein eigenes Ziel nicht
     setzen.
   - `set_eigenes_monatsziel()` wird entfernt/deaktiviert. Die `gesperrt`-Logik
     wird damit überflüssig (Selbst-Setzen gibt es nicht mehr) — Spalte bleibt
     aus Kompatibilität, wird aber nicht mehr genutzt.
2. **UI Berater-Dashboard** (`ziel-block.tsx`): Der Editier-Teil (`ZielEditor`)
   fällt weg. Der Berater **sieht** sein Ziel weiterhin (read-only) inkl.
   Fortschritt/Streak — er kann es nur nicht mehr ändern.
3. **UI zum Setzen der Downline-Ziele**: In der Downline-Übersicht des Beraters
   (Ansicht **Partner** bzw. **Team-Verwaltung**) bekommt jede Downline-Zeile
   eine Aktion „Ziel setzen" (Immo/VV), die `set_monatsziel_fuer` aufruft. Für
   GF ist das die bestehende Team-Verwaltung; für Berater die gleiche Zeilen-
   Aktion, nur auf ihre Downline beschränkt (RLS + Funktions-Check erzwingen das).

> ✅ **ENTSCHIEDEN 1 — Reichweite:** Nur **direkte** Berater (eine Ebene).
> Der Funktions-Check ist damit: Aufrufer ist GF **oder** der Zielberater hat
> `parent_berater_id = auth.uid()` (direkte Anbindung). `is_ancestor` wird hier
> also NICHT genutzt — nur die direkte Elternbeziehung.

---

## 2a. Aufgabe zuweisen (an Berater / Finanzierer) + Benachrichtigung

### Verständnis
Ich (GF, bzw. ein Vorgesetzter) kann eine Aufgabe an einen bestimmten Berater
**oder an einen Finanzierer** zuweisen. Der Zugewiesene bekommt eine
Benachrichtigung („Push").

### Ist-Zustand (Code)
- Tabelle `tasks` (`titel`, `faellig_am`, `erledigt`, `contact_id`, `deal_id`,
  `owner_id`, `created_at`) — `0007_kundenakte.sql:94`. RLS: `is_gf() OR
  owner_id = auth.uid()`. **`owner_id` ist heute = Ersteller**; ein Zuweisen an
  andere gibt es nicht.
- UI: `aufgaben/aufgaben-view.tsx`, `kontakte/contact-tasks.tsx`; Actions
  `addTask`/`toggleTask`/`deleteTask` (`kontakte/actions.ts`).
- **„Finanzierer" ist KEINE Rolle/kein Nutzer** — nur ein Freitextfeld
  `contacts.einschaetzung_durch` (Bank/Finanzierer als Text). Rollen im System:
  nur `berater`, `geschaeftsfuehrung`, `backoffice`.
- **Keine Benachrichtigungs-Infrastruktur**: kein In-App-System (keine Glocke),
  kein Web-Push/Service-Worker/PWA, kein Realtime. Nur flüchtige Toasts (`sonner`).

### Soll / Umsetzung
1. **Zuweisung** — Migration `00xx_aufgaben_zuweisung.sql`:
   - `tasks` bekommt `assigned_to uuid → profiles` und `created_by uuid →
     profiles` (bestehendes `owner_id` = zugewiesene Person migrieren).
   - **RLS neu**: sichtbar/bearbeitbar für GF, für `assigned_to`, für
     `created_by` und für die **Upline** des Zugewiesenen (`is_ancestor(auth.uid(),
     assigned_to)`) — damit ein Vorgesetzter zugewiesene Aufgaben nachverfolgen kann.
   - Server-Action `addTask` erweitert um `assignedTo` (Default: man selbst).
     Wer zuweisen darf: GF an alle; Berater an sich + an seine Downline.
2. **UI**: Beim Anlegen einer Aufgabe ein Feld „Zuweisen an" (Auswahl aus den
   sichtbaren Beratern). In der Aufgabenliste eine Markierung „von X zugewiesen"
   bzw. „an Y".
3. **Benachrichtigung (In-App)** — Migration `00xx_benachrichtigungen.sql`:
   - Tabelle `notifications` (`id`, `empfaenger_id → profiles`, `typ text`,
     `titel text`, `text text`, `link text`, `gelesen boolean default false`,
     `created_at`, optional `task_id`/`document_id`). RLS: nur der Empfänger
     (und GF) sieht/liest seine Benachrichtigungen.
   - Beim Zuweisen einer Aufgabe (und bei einer Dokument-Freigabe an einen
     Finanzierer, s. 2b) wird eine `notification`-Zeile für den Empfänger
     erzeugt.
   - **UI**: Glocke in der Topbar mit Ungelesen-Zähler + Dropdown-Liste; Klick
     markiert als gelesen und springt zum Ziel. Beim Laden ein Toast, wenn es
     neue Ungelesene gibt.
   - Echtes Geräte-Push (Web-Push) wird als späterer Ausbau vorbereitet, aber
     jetzt nicht gebaut.

> ✅ **ENTSCHIEDEN 3 — „Push":** In-App-Glocke zuerst (persistierte
> Benachrichtigungen + Ungelesen-Zähler + Toast, wenn App offen). Echtes
> Geräte-Push später mit dem Mobile/PWA-Thema (F1).

> ✅ **ENTSCHIEDEN 2 — „Finanzierer" = eigene, stark eingeschränkte Rolle.**
> Siehe eigener Abschnitt **2b**.

---

## 2b. Neue Rolle „Finanzierer" (nur freigeschaltete Dokumente)

### Verständnis (aus deiner Antwort)
Der Finanzierer ist eine **eigene Rolle** (neben Berater, Tippgeber,
Geschäftsführung). Er hat **fast keinen Zugriff**. Er sieht **ausschließlich**:
- eine Liste von **Kunden, aber nur deren Name** — und zwar nur die Kunden, bei
  denen ihm die GF Dokumente freigeschaltet hat;
- pro solchem Kunden **nur die freigeschalteten Dokumente**, die er ansehen/
  herunterladen kann.
Keine Deals, keine Finanzzahlen, keine Kontaktdaten, keine sonstigen Infos.

### Ist-Zustand
- Rollen heute: `berater`, `geschaeftsfuehrung`, `backoffice` (`rolle_enum`).
  **Keinen** Finanzierer, **kein** Freigabe-/Sharing-Konzept für einzelne
  Dokumente.
- Kundendokumente in `contact_documents` (+ Storage-Bucket `kundendokumente`),
  RLS heute: nur zuständiger Berater + GF.

### Soll / Umsetzung
1. **DB — neue Rolle** `finanzierer` in `rolle_enum` (Migration
   `00xx_rolle_finanzierer.sql`) + Helper `is_finanzierer()`.
2. **DB — Freigabe-Tabelle** `document_freigaben` (`00xx_finanzierer_freigaben.sql`):
   - `id`, `document_id → contact_documents (on delete cascade)`,
     `finanzierer_id → profiles`, `freigegeben_von → profiles`, `created_at`,
     `unique(document_id, finanzierer_id)`.
   - Freigabe erfolgt **pro einzelnem Dokument** (nicht pauschal pro Kunde) —
     passt zu „nur die freigeschalteten Dokumente".
3. **Zugriff STRIKT über SECURITY-DEFINER-RPCs** (nicht über Tabellen-SELECT,
   damit der Finanzierer garantiert keine anderen Spalten/Zeilen sieht):
   - `finanzierer_kunden()` → nur `contact_id` + `name` der Kunden mit ≥ 1
     Freigabe für `auth.uid()`.
   - `finanzierer_dokumente(p_contact_id)` → nur die für ihn freigegebenen
     Dokumente dieses Kunden (Dateiname/Anzeigename + Download-Pfad).
   - RLS auf `contacts`/`deals`/etc. gibt dem Finanzierer **nichts** direkt frei.
   - Storage: Download der freigegebenen Datei über eine signierte URL, die die
     RPC/Server-Action nur bei bestehender Freigabe ausstellt.
4. **UI Finanzierer** — eigener, minimaler Bereich (eine Seite): Kundenliste
   (nur Name) → Klick → Liste seiner freigeschalteten Dokumente mit Ansehen/
   Download. Keine Sidebar-Navigation zu anderen Modulen. Nach Login landet der
   Finanzierer direkt hier.
5. **UI Geschäftsführung — Freigeben**: In der Kundenakte (Dokumenten-Ansicht)
   je Dokument die Aktion „An Finanzierer freigeben" (Auswahl des Finanzierers).
   Übersicht/Entzug bestehender Freigaben. Beim Freigeben wird eine
   `notification` für den Finanzierer erzeugt (2a).
6. **Aufgaben an Finanzierer**: Da der Finanzierer nur Dokumente sieht, wird ihm
   eine „Aufgabe" primär als **Benachrichtigung** angezeigt (z. B. „Bitte
   Dokumente zu Kunde X prüfen") — mit direktem Link auf die freigeschalteten
   Dokumente. Kein voller Aufgaben-Bereich für ihn.

> ❓ **ENTSCHEIDUNG 5 — Freigabe-Granularität bestätigen:** Freigabe **pro
> einzelnem Dokument** (GF hakt gezielt Dokumente an), richtig? Alternative wäre
> „ganzer Kunde = alle seine Dokumente auf einmal". **Empfehlung:** pro Dokument
> (wie oben), weil du „nur die freigeschalteten Dokumente" gesagt hast — mit
> einem „alle auswählen"-Shortcut fürs bequeme Freigeben.

> ℹ️ **Hinweis zu „Tippgeber":** Du hast Tippgeber als Rolle genannt. Aktuell
> ist Tippgeber im System **keine Login-Rolle**, sondern ein Feld am Deal
> (`tippgeber`/`tippgeber_satz`). Falls Tippgeber ebenfalls eine eigene
> Login-Rolle mit eigener Ansicht werden soll, ist das ein separates Thema —
> sag kurz Bescheid, dann nehme ich es auf. Für die aktuellen To-dos lasse ich
> Tippgeber wie bisher.

---

## 3. Automatische Benennung beim Dokumenten-Upload

### Verständnis
Beim Hochladen soll ein Dokument automatisch eine **standardisierte
Bezeichnung** bekommen. Beispiel: eine Datei „Perso Andy" wird in den Dokumenten
automatisch zu „Personalausweis …".

### Ist-Zustand (Code)
- Upload speichert den **Originaldateinamen** in `contact_documents.dateiname`,
  den gewählten Typ in `kategorie` + `document_type_id`
  (`kontakte/document-checklist.tsx`, `staged-checklist.tsx`). Angezeigt wird
  der Originalname.
- Es gibt einen **Typen-Katalog** `document_types` (z. B. „Personalausweis /
  Reisepass …", „Die letzten drei Gehaltsnachweise …") und bereits ein
  Schlagwort-Mapping `LEGACY_KAT` in `src/lib/dokumente.ts` (z. B. „Ausweis" →
  Personalausweis-Punkt).
- Uploads passieren fast immer **in einen bestimmten Checklisten-Slot** — d. h.
  der **Typ ist beim Upload schon bekannt**, ebenso der **Kontakt** (die Person).

### Soll / Umsetzung
1. **DB**: `contact_documents` bekommt `anzeigename text` (die generierte
   Bezeichnung). Der Originaldateiname bleibt in `dateiname` erhalten (für den
   Download). Migration `00xx_dokument_anzeigename.sql`.
2. **Ableitungslogik** (`src/lib/dokumente.ts`, neue Funktion
   `ableitAnzeigename(typ, kontaktname, dateiname)`):
   - **Primär (robust):** Wird in einen Slot hochgeladen, ist der Typ bekannt →
     `anzeigename = "<Kurzname des Typs> — <Kontaktname>"`, z. B.
     „Personalausweis — Andreas Müller". (Kurzname = griffige Kurzform des
     teils langen Katalognamens, z. B. „Personalausweis" statt „Personalausweis
     / Reisepass (Vorder- und Rückseite)".)
   - **Fallback (freier Upload/„Sonstige"):** kein Slot → Schlagwort-Erkennung
     aus dem Dateinamen über eine erweiterte Mapping-Tabelle („Perso"/„Ausweis"
     → Personalausweis, „Gehalt"/„Lohn" → Gehaltsnachweis, „Steuer" →
     Steuerbescheid …). Rest (Person) aus dem Kontaktnamen bzw. dem Dateinamen.
3. **UI**: In der Dokumentenliste wird der `anzeigename` angezeigt; der
   Originalname bleibt als kleiner Zusatz/Tooltip sichtbar. Bei mehreren Dateien
   pro Typ automatische Nummerierung („… (2)").

> ✅ **ENTSCHIEDEN 4 — Woraus kommt der Name?** Im Regelfall **Slot +
> Kontaktname** („Personalausweis — Andreas Müller"); bei freien Uploads ohne
> Slot **Schlagwort-Erkennung aus dem Dateinamen** als Netz.
> _(Format „Typ — Person" nehme ich als Standard an; falls du z. B. „Typ Person"
> ohne Bindestrich willst, ist das eine Zeile.)_

---

## Reihenfolge der Umsetzung (nach deiner Freigabe)
1. **Ziele — nur direkte Berater setzbar** (klar umrissen, kleinste Migration).
2. **Dokument-Auto-Benennung** (in sich abgeschlossen).
3. **In-App-Benachrichtigungen (Glocke)** — Basis für 4 + 5.
4. **Aufgaben-Zuweisung** (an Berater; nutzt die Benachrichtigungen).
5. **Neue Rolle „Finanzierer" + Dokument-Freigabe** (größtes Teilstück;
   Rolle, Freigabe-Tabelle, RPCs, eigener Minimal-Bereich, GF-Freigabe-UI) —
   inkl. Aufgabe/Benachrichtigung an Finanzierer.

Offen ist nur noch **Entscheidung 5** (Freigabe pro Dokument — meine Empfehlung).
Sobald du die bestätigst bzw. korrigierst, setze ich in dieser Reihenfolge um und
melde mich nach jedem Punkt.
