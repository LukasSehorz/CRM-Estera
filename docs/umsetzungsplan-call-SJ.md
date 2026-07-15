# Umsetzungsplan — Feedback-Call SJ (final, mit Kunden-Antworten)

**Stand:** 15.07.2026 · Quelle: Transkript „Transkript call SJ" (Audio + Video, 31 Seiten,
komplett durchgegangen) + Kunden-Antworten F1–F12 (mit Screenshots SC1–SC11).
Sprecher 1 & 3 = Kunde (Sebastian / Danny), Sprecher 2 = Lukas.

Legende: ✅ vorhanden · 🟡 anzupassen · ⬜ neu bauen · 🔁 Entscheidung ändert bereits
Gebautes.

---

## 0. Getroffene Entscheidungen (aus F1–F12) — kurz

1. **Immo-Provisionsberechnung ist entschieden: IMMER „vom Kaufpreis".** Der GF-Umschalter
   (zwei Auswahl-Karten) wird **entfernt**. 🔁 (F3)
2. **Immo-Berater-Anteil** wird beim **Berater-Anlegen** gesetzt (Regler 1–10 %). (F3)
3. **„Ohne Factoring" wird ab jetzt MIT Einbehalt gerechnet** (85 % sofort / 15 % Einbehalt
   nach 12 Mon.) — nicht mehr „voll sofort". 🔁 (F1.4) — ändert die frühere Regel
   „Einbehalt nur mit Factoring".
4. **Hausanteil-Zeile** raus aus der Deal-Vorschau. (F1.1)
5. **Provisionssatz + Berater-Anteil** in der **Berater-Ansicht** komplett ausblenden. (F2)
6. **Tippgeber werden verwaltete Einträge** (anlegen, individuelle Provision, filterbar),
   nicht mehr nur Freitext. (F6)
7. **Struktur mehrstufig** (Baum/Organigramm), **Berater dürfen eigene Downline/Tippgeber
   selbst anlegen** (nur eigene Leute). 🔁 (F5) — hebt die aktuelle 1-Ebenen-Sperre auf.
8. **„Kontakte" → „Kunden"**, mit Segmentierung Interessent / In Pipeline / Bestandskunde. (F4)
9. **Whitelabel + Baukasten**: gewünscht, aber **erst im nächsten Schritt** (Phase 6). (F8/F9)
10. **Backup/Datensicherheit**: einrichten (Phase 7). (F12)

---

## Phase 1 — Dokumente & Unterlagen (DRINGEND)

**Ziel:** Kundenunterlagen überall sichtbar, öffenbar, pro Kunde gebündelt; auch am Deal und
schon beim Anlegen.

- [ ] **1.1** Dokument-Sektion für **alle** Kontakte anzeigen (heute an „interesse =
  Immobilien" gekoppelt → bei VV-/neutralen Kunden erscheint nichts). **Behebt das
  „wird nicht angezeigt / kann nicht öffnen"** aus dem Call (1:29). → `kontakte/[id]/page.tsx`
- [ ] **1.2** Freier Uploader: **mehrere Dateien** erlauben (`multiple`); Checkliste kann es
  bereits. → `kontakte/contact-documents.tsx`
- [ ] **1.3** Upload **schon im Kunden-Anlegen-Formular** (18:40). → `kontakte/neu`,
  `contact-form.tsx`
- [ ] **1.4** **Dokumente/Unterlagen auf der Deal-Detailseite** (Immo **und** VV), mit
  Vorlage/Checkliste „was hochzuladen ist" (1:14, 27:49, 46:34). → `deals/[id]`
- [ ] **1.5** **Kundenname überall als Link** zur Akte („Unterlink", 22:50) — Dashboard,
  Deals, Performance, Signale, Eingeschätzte Kunden.
- [ ] **1.6** Kategorie **„Reservierungen"** (Reservierungsformular +
  Reservierungsvereinbarung) als eigener Bereich **und** in den Kundenunterlagen (20:32,
  44:16). → `config/enums.ts`, Migration + `portal-view.tsx`
- [ ] **1.7** Vorlagen je Sparte: feste Kategorien vorbenennen (Immo: Selbstauskunft/
  Reservierung; VV: Anbindungsformular) — Spiegelung zu Beratern besteht schon (20:00).
- [x] **1.8** Trennung: Berater sieht nur eigene Kundendokumente — **per RLS bereits erzwingt
  & verifiziert** (20:59). Nichts zu tun.
- [x] **1.9** Kundenunterlagen als **ein Ordner je Kunde** — vorhanden.

---

## Phase 2 — Deal-Formular: Provisions-Sichtbarkeit & VV-Rechnung

**Ziel:** Berater sehen niemals Estera-interne Zahlen; VV-Rechnung sauber & verständlich;
Immo immer vom Kaufpreis.

- [ ] **2.1** **„Hausanteil (Estera)"-Zeile entfernen** aus der Provisionsvorschau (Immo +
  VV). (F1.1) → `deals/deal-form.tsx`
- [ ] **2.2** **Vorschau übersichtlicher**: klar machen, dass der **Tippgeber von derselben
  Basis wie die 70 %** abgeht (nicht von „Deine Provision") — Trennlinien, Gruppierung,
  Beschriftung „Tippgeber (20 % der Provision nach Factoring)". Rechnung bleibt gleich
  (ist korrekt). (F1.3)
- [ ] **2.3** **„Ohne Factoring" MIT Einbehalt** rechnen (85 % sofort / 15 % Einbehalt nach
  12 Mon.); Hinweistext & Zahlart-Label anpassen. (F1.4) 🔁 → `lib/provision.ts`,
  `deal-form.tsx`
- [ ] **2.4** **„negative Bonität"** aus dem Ratierlich-Label entfernen (Auslandspass ⇒
  ratierlich, aber nicht negativ; 27:49–29:35). → `lib/provision.ts`
- [ ] **2.5** **Provisionssatz-Feld** in der Berater-Ansicht **komplett ausblenden** (nur GF).
  (F2/SC4) → `deal-form.tsx`
- [ ] **2.6** **Berater-Anteil-Feld** in der Berater-Ansicht **komplett ausblenden** (nur GF).
  (F2/SC4)
- [ ] **2.7** **Provisionsvorschau** in der Berater-Ansicht: Estera-interne Zeilen aus.
  *Empfehlung:* ganze Vorschau für Berater ausblenden (Einkommen sieht er unter „Mein
  Einkommen"), wie im Call gesagt („Provisionsvorschau weglassen bei Beratern", 29:25).
  → **Kurz bestätigen:** ganz ausblenden, oder nur die Estera-Zeilen (Berater sieht „Deine
  Provision/Gewinn")?
- [ ] **2.8** **Immo-Provisions-Modus fest „vom Kaufpreis"**, die zwei Auswahl-Karten
  (`ImmoProvisionCard`) **entfernen**. 🔁 (F3/SC5) → `team/page.tsx`,
  `team/einstellungen-card.tsx`, `lib/provision.ts`
- [x] **2.9** Tippgeber-Rechnung (20 % von der nach-Factoring-Basis) — **bereits korrekt**,
  nur Darstellung (siehe 2.2).

---

## Phase 3 — Berater/Tippgeber anlegen & Struktur-/Partner-System (Kern)

**Ziel:** Vollständiges, mehrstufiges Struktursystem; Berater bauen ihr eigenes Team &
sehen dessen Performance; motivierend dargestellt.

**Berater/Tippgeber anlegen**
- [ ] **3.1** „Neuen Berater anlegen": **Immo-Anteil (%) als Regler 1–10** ergänzen. (F3/SC5)
  → `team/stufe-table.tsx` (NeuerBeraterForm), `team/actions.ts` (createBerater)
- [ ] **3.2** **„Neuen Tippgeber anlegen"** (GF-Ansicht) — wie Berater, mit **individueller
  Provision** (10/15/40 %). (F6/58:00)
- [ ] **3.3** Team-Liste **nach Berater / Tippgeber filterbar**. (F6)
- [ ] **3.4** Partner/Tippgeber **Sparten frei wählbar** — nicht automatisch VV, wenn nur
  Immobilien (25:08).

**Struktur / Organigramm**
- [ ] **3.5** Struktur als **Baum/Organigramm**, **mehrstufig** (Eva → Lukas → dessen
  Berater), **Berater vs. Tippgeber unterscheidbar**, schön dargestellt. (F5)
- [ ] **3.6** **Hover** über einen Knoten → Performance (Umsätze) des Berater/Tippgeber — in
  **GF-Team-Verwaltung** (SC9) **und** Berater-Ansicht. (F5)
- [ ] **3.7** **Mehrebenen freischalten**: DB-Constraint „nur eine Ebene" aufheben,
  Rekursion in `downlineOf`/Overhead. 🔁 (F5) → `supabase/migrations/*`, `lib/analytics.ts`
- [ ] **3.8** **Berater-Self-Service**: Berater legt eigene Berater/Tippgeber an & setzt deren
  Provision — **nur für die eigenen Leute** (RLS/SECURITY DEFINER). (F5/F6/40:07)
- [ ] **3.9** **Berater-„Team-Verwaltung"** analog GF, für die eigene Downline. (F5)
- [ ] **3.10** **Overhead ausweisen**: Berater verdient an Downline/Tippgeber mit — in
  Performance/Struktur sichtbar. (F5)
- [ ] **3.11** Gamifizierte **„Partner"-Seite** (eigener Nav-Punkt): Anzahl Partner, bester
  Tippgeber, wer wie viel Umsatz — motivierend & einfach lesbar. (56:29)

---

## Phase 4 — „Kunden" statt „Kontakte" + Segmentierung

- [ ] **4.1** **„Kontakte" → „Kunden"** umbenennen (Nav, Titel, Buttons; ~20–25 Labels).
  (F4/SC7)
- [ ] **4.2** **Segmentierung** (F4):
  - **Interessent** — eingetragen, aber **noch nicht in der Pipeline** (kein Deal/kein
    Erstgespräch).
  - **In Pipeline** — hat einen aktiven Deal (die VV-Pipeline beginnt mit Phase
    „Interessent 10 %").
  - **Bestandskunde** — mind. 1 Abschluss.
  - *Konzept-Hinweis:* damit es nicht mit der Pipeline-Phase „Interessent (10 %)" kollidiert,
    für das **Kunden-Segment eine andere Bezeichnung** wählen (z. B. Segment „Interessent"
    vs. Pipeline-Phase „Neuer Lead"). Vorschlag im Umsetzungsschritt, dann Freigabe.

---

## Phase 5 — Dashboard-Feinschliff & Signale

- [ ] **5.1** „Gewichtet (realistisch)" → **„Forecast"** + **Info-`?`-Tooltip** (erklärt die
  Gewichtung nach Phasen-Wahrscheinlichkeit). (F4/SC6) → `dashboard/midnight-cards.tsx`
- [ ] **5.2** **Umsatzentwicklungs-Chart größer**. (2:35) → `dashboard/overview-card.tsx`
- [ ] **5.3** **Pipeline-Volumen** bei Immobilien: leere rechte Hälfte → volle Breite.
  (11:14) → `dashboard/pipeline/page.tsx`
- [ ] **5.4** **Berater-Performance (GF):** Berater-Liste weiter nach oben. (23:57)
- [ ] **5.5** **Berater-Performance (Berater-Ansicht):** „Umsatz pro Berater" macht keinen
  Sinn (nur man selbst) → durch **eigene Downline-Performance** ersetzen. (F5/SC8)
- [ ] **5.6** **7-Tage-Rückblick + 7-Tage-Forecast** — Berater- **und** GF-Ansicht (zusätzlich
  zu 30/60/90). (F5/F7)
- [ ] **5.7** **GF-Signal „Einbehalte fällig" entfernen** (wird automatisch ausgezahlt).
  (F11/SC11) → `dashboard/performance/gf-signale.tsx`
- [ ] **5.8** **GF-Signal „fehlende Dokumente"** ergänzen (unvollständige Kundenakte; 13:31).
- [ ] **5.9** **Eingeschätzte Kunden:** Spalte **„Objekt (frei)" entfernen/ersetzen**.
  (F10/SC10)
- [ ] **5.10** **To-Dos bei Beratern präsenter** (oben / eigener Bereich). (41:46)
- [ ] **5.11** **„Listen" → „Übersichten"** umbenennen. (26:04) → `app-sidebar.tsx`
- [ ] **5.12** **Weißes/Light-Mode-Dashboard entbuggen**. (40:50)
- [ ] **5.13** **„Karriere" als eigener Nav-Punkt**: alle Stufen + Fortschritt; **GF-Übersicht
  aller Berater-Stufen**. (52:09)
- [ ] **5.14** „Kugel"/Sphere: optional behalten, ggf. als „Live-Tracking" labeln. (53:29)

---

## Phase 6 — Whitelabel & Baukasten (nächster Schritt, nicht sofort)

- [ ] **6.1** **Whitelabel-Version** ohne Estera-Branding (für Vertriebe/Marken, die ohne
  Branding verkaufen); eigenes Emblem nutzbar. (F8/41:06/46:xx)
- [ ] **6.2** **Baukasten/CMS**: Nutzer passen KPIs, Anordnung, Farben selbst an. Braucht ein
  Konzept (Voll-Baukasten vs. schlanke Einstellungsseite). (F9/6:51)

---

## Phase 7 — Zukunft / Ops

- [ ] **7.1** **Backup/Redundanz** (Supabase PITR/Backups) — Datensicherheit. (F12/9:26)
- [ ] **7.2** **Ads-Lead-Intake**: Meta-Ads (Instant Form/Landing Page) → CRM,
  Benachrichtigung, Berater-Zuweisung, Anruf-SLA 1–2 h (n8n/Code). (53:46)
- [ ] **7.3** **Reports** durch Vertriebspartner erstellbar. (44:16)
- [ ] **7.4** **Umsatz nach Quelle / ROI** feintunen. (8:25)
- [ ] **7.5** **Bemessungsgrundlage Immo**: Kaufpreis − Nebenkosten/Rückstellung
  (Reservierungstellung). (36:35)
- [ ] **7.6** **Research** (Close-CRM-Ideen, eigene Verbesserungen). (55:48)
- [ ] **7.7** **Meeting-/Präsentationsmodus** (interne Zahlen ausblenden). (V4.1)

---

## Anhang A — Erklärungen (für intern)

**Hausanteil.** Der Teil der Estera-Netto-Provision, der nach dem Berater-Anteil bei Estera
bleibt. VV: BWS × 7,8 % × 90 % (Factoring) = Netto-Pool; davon Berater = Vertriebler-Stufe
(z. B. 70 %) = „Deine Provision", Rest (30 %) = Hausanteil = Esteras Marge. In der
Deal-Vorschau verwirrend + verrät die Marge → raus; nur im Overhead-Kontext relevant.

**Tippgeber-Rechnung (Beispiel SC2, BWS 96.000 €).**
Netto-Pool nach Factoring = 6.739,20 €. Berater 70 % = 4.717,44 €. Tippgeber 20 % =
**20 % des Pools** = 1.347,84 € (nicht 20 % von 4.717,44 €). Berater-Gewinn = 4.717,44 −
1.347,84 = 3.369,60 € (= 50 % des Pools). ⇒ Rechnung stimmt, nur Darstellung wird klarer.

---

## Anhang B — Nur bestätigen (kein Blocker)

- **2.7:** Provisionsvorschau für Berater **ganz** ausblenden (empfohlen) oder nur die
  Estera-Zeilen (Berater sieht „Deine Provision/Gewinn")?
- **4.2:** Bezeichnungen der Kunden-Segmente final (Interessent / In Pipeline /
  Bestandskunde) — Vorschlag kommt im Umsetzungsschritt.
