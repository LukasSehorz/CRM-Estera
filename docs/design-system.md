# Estera CRM — Designsystem

> Verbindliche Gestaltungsvorgabe für das gesamte Frontend. Ab Phase 3 hält
> sich Claude Code in JEDER Phase an dieses Dokument. Wenn eine Komponente
> gebaut wird, wird hier zuerst nachgesehen. Im Zweifel: lieber ruhiger und
> konsistenter als verspielt.
>
> Referenz-Look: diskretes, seriöses Premium-CRM im Estera-Branding —
> „Vermögen mit Substanz". Tiefes Marineblau/Anthrazit (Navy) trägt die
> Fläche, warmes Bronze-Gold ist der einzige Akzent (sparsam), weiche Karten,
> viel Ruhe, datenstarke Visualisierungen. Dark ist der Hauptmodus (Navy-
> Flächen, Gold-Akzent), Light eine gleichwertige, eigenständige Variante
> (Weiß/neutral als Fläche, Navy als Text/Struktur). Beide werden gebaut
> und sind umschaltbar.

---

## 1. Grundhaltung

- **Wertig, ruhig, modern.** Großzügige Abstände, klare Hierarchie, keine
  visuelle Überladung. Die Daten sind der Star, nicht die Deko.
- **Navy trägt die Fläche, Gold ist der einzige Akzent — sparsam.** Bronze-
  Gold markiert aktive/hervorgehobene Elemente (aktive Navigation, Fokusring,
  Kennzahlen-Highlights, primäre CTAs, Diagramm-Primär). Flächig eingesetzt
  wirkt Gold billig — also nur punktuell. Navy und gedeckte Neutraltöne tragen
  alles andere.
- **Konsistenz vor Kreativität.** Gleiche Dinge sehen überall gleich aus:
  jede Karte, jeder Button, jede Tabelle folgt demselben Muster.

---

## 2. Farben

Umsetzung über CSS-Variablen in `globals.css`, getrennt nach `:root` (Light)
und `.dark` (Dark). Die Werte sind als **vollständige `hsl(...)`-Farben**
hinterlegt (HSL-Format, direkt in `var()` und als SVG-`fill` in den Charts
nutzbar); der Ausgangs-Hex steht jeweils als Kommentar daneben. shadcn/ui-
Tokens sind auf diese Werte gemappt, die Tailwind-Utilities entstehen im
`@theme inline`-Block (Tailwind v4 — es gibt bewusst keine separate
`tailwind.config.ts`). **Keine Farb-Hardcodes in Komponenten — immer Tokens.**

### Markenfarben (Herkunft)
| Name | Hex | Rolle |
|---|---|---|
| Estera Navy | `#0F1B2D` | Primär-Dunkel, trägt die Fläche (Dark) / Text (Light) |
| Estera Navy Deep | `#0A121E` | fast schwarz, App-Hintergrund im Dark |
| Estera Gold | `#C9A24B` | einziger Akzent, sparsam |
| Estera Gold Soft | `#E3C888` | heller Goldton, Hover/Highlight |
| Estera Slate | `#4A5568` | gedecktes Blaugrau, Neutral/sekundärer Text |
| Off-White | `#F5F3EE` | warmes Gebrochen-Weiß, Fläche (Light) / Text (Dark) |

### Gold-Akzent (`--gold`, `--gold-soft`, `--gold-contrast`, `--accent-500`)
Gold ist **kein flächiger Ton**, sondern markiert punktuell: aktive Nav,
Fokusring (`--ring`), Kennzahlen-Highlights, primäre CTAs, Diagramm-Primär.
| Token | Dark | Light | Verwendung |
|---|---|---|---|
| `--gold` / `--accent-500` | `#C9A24B` | `#C9A24B` | Fokusring, Flächen/Fills, große Elemente |
| `--gold-soft` / `--accent-400` | `#E3C888` | `#E3C888` | Hover/Highlight, Verlaufskopf |
| `--gold-contrast` | `#E3C888` | `#8A6D1E` | **Gold als Text** (auf Fläche AA-sicher) |
| `--accent-600` | `#B5843A` | `#A67C28` | Bronze, Hover/Tiefe, Verlaufsfuß |
| `--accent-gradient` | Gold→Bronze | Gold-Soft→Bronze | Charts, Funnel, Hero-Zahlen |

> ⚠️ Der shadcn-Token `--accent` ist **nicht** die Markenfarbe, sondern die
> dezente Hover-/Muted-Fläche (= `--surface-2`). So bleibt „gold sparsam".
> Für Gold-Wirkung immer `gold`/`accent-500`/`ring`/`accent-gradient` nutzen,
> nie `bg-accent`. Gold als **Text auf hellem Grund** nur über `gold-contrast`
> (das reine `#C9A24B` erreicht auf Off-White keine 4.5:1).

### Dark-Modus (Hauptmodus — Navy-Flächen)
| Token | Hex | Verwendung |
|---|---|---|
| `--background` | `#0A121E` | App-Hintergrund (Navy Deep) |
| `--surface` / `--card` | `#0F1B2D` | Karten, Sidebar, Panels (Navy) |
| `--surface-2` | `#16273D` | erhöhte Flächen, Hover-Zeilen, Inputs |
| `--border` | `#24344B` | Kartenränder, Trennlinien (dezent) |
| `--foreground` | `#F5F3EE` | Überschriften, Werte (Off-White) |
| `--text-secondary` | `#A9B4C4` | Labels, sekundärer Text (~8:1) |
| `--text-muted` | `#7E8CA0` | Platzhalter, Hilfetext (~4.8:1) |
| `--primary` | `#88AEDC` | helles Stahlblau — Links, Tints, Buttons (~7:1 auf Navy), Button-Text `#0A121E` |

### Light-Modus (Weiß/neutral, Navy als Struktur)
| Token | Hex | Verwendung |
|---|---|---|
| `--background` | `#F7F7FB` | App-Hintergrund (helles neutrales Weiß) |
| `--surface` / `--card` | `#FFFFFF` | Karten, Sidebar, Panels |
| `--surface-2` | `#F1F1F7` | Hover-Zeilen, Inputs |
| `--border` | `#E6E6EF` | Ränder, Trennlinien |
| `--foreground` | `#0F1B2D` | Überschriften, Werte (Navy, ~16:1) |
| `--text-secondary` | `#4A5568` | Labels, sekundärer Text (Slate, ~7:1) |
| `--text-muted` | `#626E82` | Platzhalter, Hilfetext (~5:1) |
| `--primary` | `#0F1B2D` | Primär = Navy, Text `#F5F3EE` |

### Ausgewählte Zustände (`--primary-soft`)
Aktive Navigation, Tab-Unterstreichung, Segment-Switcher nutzen
`--primary-soft` (Text/Rand) + `bg-primary-soft/10…15` (Fläche):
| Modus | Wert | Wirkung |
|---|---|---|
| Light | `#0F1B2D` (= Navy) | wie Primär |
| Dark | `#88AEDC` helles Stahlblau | Auswahl ist auf Navy sofort erkennbar (~7:1) |

### Semantische Status (CRM-Kontext, beide Modi, gedämpft — nie grell)
Dark heller, Light abgedunkelt, damit beide AA erreichen.
| Token | Dark | Light | Bedeutung |
|---|---|---|---|
| `--success` | `#35C281` | `#157A48` | Deal gewonnen / positive Rendite |
| `--warning` | `#E7B45A` | `#AE7413` | Deal ins Stocken geraten |
| `--danger` / `--destructive` | `#F06A7E` | `#D23A54` | Deal verloren |
| `--info` | `#57A8E8` | `#2B7CC4` | neutral-informativ |

Phasen-/Status-Badges nutzen die Statusfarbe als Text + dieselbe Farbe mit
~12–15 % Deckkraft als Hintergrund (Pill-Form), nicht vollflächig.

### Pipeline-/Kanban-Stage-Farben (`--stage-1` … `--stage-8`)
Harmonische, unterscheidbare Palette; als Dot, Pill oder linker Spaltenrand
gedacht (nicht als kleiner Text). Dark heller, Light abgedunkelt.
| Token | Dark | Light | Ton |
|---|---|---|---|
| `--stage-1` | `#5E86B5` | `#3E628C` | Stahlblau |
| `--stage-2` | `#3CA79A` | `#2C7C72` | Teal |
| `--stage-3` | `#C9A24B` | `#A67C28` | Gold/Bronze |
| `--stage-4` | `#E0A23C` | `#B57A22` | Amber |
| `--stage-5` | `#D57B5D` | `#B0563A` | Terrakotta |
| `--stage-6` | `#D56A85` | `#B24865` | Rosé |
| `--stage-7` | `#9584C0` | `#6E5C9C` | gedämpftes Violett |
| `--stage-8` | `#5FAE77` | `#3E8659` | Salbeigrün |

### Kontrast-Notizen (WCAG AA)
- Gold `#C9A24B` auf Navy `#0F1B2D` ≈ **6.9:1** → Gold-Text/-Icons auf Navy
  bestehen AA. Auf Off-White erreicht `#C9A24B` nur ~2.1:1 → dort
  `--gold-contrast` (`#8A6D1E`, ~4.6:1) für Text, das reine Gold nur für
  Flächen/Ring (große Elemente, 3:1).
- Navy `#0F1B2D` auf Off-White `#F9F7F1` ≈ **14:1**, Off-White auf Navy ≈ 16:1.
- `text-secondary`/`text-muted` sind in beiden Modi ≥ 4.5:1 gewählt.
- Charts sind große Grafikelemente (3:1-Schwelle); die Primär-Serie ist
  theme-abhängig (`--chart-1`: Light tief, Dark hell).

---

## 3. Typografie

- **Display / UI:** „Inter" (oder „Geist"), bei Bedarf via next/font geladen.
  Eine moderne, neutrale Grotesk, wie im Referenz-Look.
- **Zahlen / Daten:** tabellarische Ziffern aktivieren
  (`font-variant-numeric: tabular-nums`) für Beträge und Tabellen, damit
  Spalten sauber untereinander stehen.
- Keine zweite Display-Schrift, keine Serifen. Ruhe durch eine Familie.

### Typo-Skala
| Rolle | Größe / Gewicht | Einsatz |
|---|---|---|
| Display | 28–32px / 700 | große KPI-Werte (€128.540) |
| H1 | 22px / 600 | Seitentitel |
| H2 | 18px / 600 | Kartentitel, Sektionen |
| Body | 14px / 400 | Standardtext, Tabellen |
| Label | 13px / 500 | Feldlabels, Nav |
| Caption | 12px / 400 | Hilfetext, Zeitstempel |

Begrüßung/Seitentitel dürfen kräftig sein (z. B. „Guten Morgen, Max"),
Labels bleiben ruhig in `text-secondary`.

---

## 4. Layout & Spacing

- **Grundraster 8px.** Abstände in Vielfachen: 8 / 12 / 16 / 24 / 32.
- **Sidebar links**, fest, dunkle Surface-Farbe. Logo oben, Navigation
  darunter mit Icons, aktiver Eintrag mit Akzent-Hintergrund (gefüllt, weich)
  und Akzent-Text. Unten der eingeloggte Berater mit Name + Rolle + Abmelden.
- **Top-Bar** im Content: Seitentitel + kurze Subline links, Suche +
  Aktionen rechts.
- **Karten** sind das Grundelement: `bg-surface`, `border`, `radius-lg`,
  Innenabstand 20–24px. Inhalte in Karten gruppiert, nie „nackt" auf den
  Seitenhintergrund.
- **Content-Maximalbreite** großzügig, aber nicht endlos; Dashboards dürfen
  mehrspaltig sein (Grid), Detailseiten zweispaltig (Hauptspalte + schmale
  Seitenspalte für Meta/Aktivitäten).

---

## 5. Form & Stil der Bausteine

| Element | Vorgabe |
|---|---|
| Eckenradius | `radius-sm` 8px (Inputs, Badges), `radius-lg` 14px (Karten, Modals) |
| Schatten | sehr dezent; im Dark kaum sichtbar, im Light weich (`0 1px 3px rgba(0,0,0,.06)`) |
| Ränder | 1px, `border`-Token; Trennung über Farbe, nicht über harte Linien |
| Primär-Button | `bg-primary` (Navy) + `text-primary-foreground` (Off-White), `radius-sm`, Hover leicht abgedunkelt |
| Gold-CTA (Emphasis) | `bg-accent-500` (Gold) + Navy-Text (`text-foreground dark:text-background` — auf Gold ist Text in beiden Modi dunkles Navy), sparsam — die *eine* Hauptaktion je Ansicht |
| Sekundär-Button | transparent/`bg-surface-2`, `border`, `text-foreground` |
| Inputs | `bg-surface-2`, `border`, Fokus = Gold-Ring (`ring` 2px), kein Glow |
| Tabellen | Kopfzeile in `text-secondary`/Caption, Zeilen-Hover `bg-surface-2`, dezente Zeilentrenner |
| Icons | eine Bibliothek (lucide-react), Strichstärke einheitlich, Größe 16–20px |

---

## 6. Datenvisualisierung (für Dashboards, Phase 6)

Stil wie im Referenz-Look: ruhige Flächen, Akzent-Verläufe, keine grellen
Vielfarb-Paletten.

- **KPI-Karten:** großer Wert (Display), kleines Label darüber/darunter,
  Veränderung in `success`/`danger` mit Pfeil, optional dezentes Mini-Icon
  in Akzent-Pill oben.
- **Linien-/Flächencharts:** Akzentlinie mit weichem Verlauf darunter
  (accent → transparent), dünnes Raster in `border`-Farbe, Tooltips als
  kleine Surface-2-Karten.
- **Funnel / Pipeline-Trichter:** gestapelte Segmente im Akzent-Verlauf,
  von kräftig (oben, viele Leads) zu dunkler (unten), Werte rechts daneben.
  Passt direkt auf die Pipeline-Phasen mit Wahrscheinlichkeit.
- **Donut (z. B. Umsatz nach Quelle):** Gold-Familie + Navy/Slate-Töne
  (`--chart-1` … `--chart-6`), Gesamtwert in der Mitte.
- **Balken:** Gold-Verlauf (`--accent-gradient`), abgerundete Kappen,
  ausreichend Abstand.

Bibliothek: recharts (ist im Stack verfügbar). Farben ausschließlich aus
`src/components/charts/chart-colors.ts` (bzw. den `--chart-*`-Tokens) ziehen,
nicht neu erfinden. Kategoriale Serien sind theme-abhängig (Dark heller, Light
tiefer); Verläufe/`lerpHex` nutzen die festen Gold-Hex aus `CHART_HEX`.

---

## 6a. Beispiel-Snippets (Light & Dark identisch — Tokens regeln den Modus)

```tsx
// Primär-Button (Navy) — die Standard-Aktion
<button className="rounded-md bg-primary px-4 py-2 text-sm font-medium
  text-primary-foreground transition-colors hover:opacity-90
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
  Deal anlegen
</button>

// Gold-CTA (Emphasis) — sparsam, die eine Hauptaktion.
// Auf Gold ist der Text in BEIDEN Modi dunkles Navy.
<button className="rounded-md bg-accent-500 px-4 py-2 text-sm font-semibold
  text-foreground dark:text-background transition-colors hover:bg-accent-600
  focus-visible:ring-2 focus-visible:ring-ring">
  Abschluss buchen
</button>

// Sekundär-Button
<button className="rounded-md border border-border bg-surface-2 px-4 py-2
  text-sm text-foreground hover:bg-surface">
  Abbrechen
</button>

// Karte
<div className="rounded-xl border border-border bg-card p-6 text-card-foreground">
  <p className="text-sm text-muted-foreground">Pipeline-Volumen</p>
  <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">1.284.000 €</p>
  <p className="mt-2 text-sm font-medium text-success">+12,5 %</p>
</div>

// Status-Badge (Farbe als Text + ~12 % Fläche)
<span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs
  font-medium text-success" style={{ background: "color-mix(in srgb, var(--success) 14%, transparent)" }}>
  Gewonnen
</span>

// Kennzahl-Highlight in Gold (Text -> gold-contrast, AA in beiden Modi)
<span className="text-2xl font-bold text-gold-contrast tabular-nums">28,4 %</span>

// Pipeline-Stage-Marker (Dot / linker Rand)
<span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--stage-3)" }} />
```

**Do:** Gold nur punktuell (Ring, aktive Nav, eine CTA, Kennzahl). Flächen in
Navy/Surface. Status über die semantischen Tokens. **Don't:** `bg-accent` für
Gold missbrauchen (= Hover-Fläche), reines `#C9A24B` als Fließtext auf Light,
mehr als eine Gold-CTA pro Ansicht, Chart-Farben hart als Hex in Komponenten.

---

## 7. Dark/Light-Umschaltung

- Beide Modi werden vollständig gebaut und sind gleichwertig.
- Umschalter dezent in der Top-Bar oder im Berater-Menü unten in der Sidebar.
- Theme über `next-themes`, Klasse `.dark` am `<html>`, kein Flackern beim
  Laden (Theme-Script im Head). Default: Dark.

---

## 8. Bereichs-Trennung Immobilien / Vermögensverwaltung

Spec verlangt klare Trennung in der Navigation. Umsetzung:
- Beide Bereiche als eigene Nav-Punkte mit eigenem Icon.
- Optional ein dezenter, je Bereich leicht unterschiedlicher Sekundärton
  (innerhalb der Akzentfamilie, NICHT zwei konkurrierende Farben), nur als
  feine Markierung (z. B. Rand der aktiven Pipeline-Spalte). Akzent bleibt
  führend, damit es eine Anwendung bleibt und nicht zwei.

---

## 9. Texte / Microcopy (Deutsch)

- Aktive Verben auf Buttons: „Kontakt speichern", „Deal anlegen", nicht
  „Absenden".
- Gleicher Begriff im ganzen Flow (Button „Anlegen" → Toast „Angelegt").
- Leere Zustände sind eine Einladung zur Aktion, nicht nur „Keine Daten":
  z. B. „Noch keine Kontakte. Lege deinen ersten Kontakt an." mit Button.
- Fehlerzustände sagen, was passierte und was zu tun ist, sachlich, ohne
  Entschuldigung: „Speichern fehlgeschlagen. Prüfe deine Verbindung und
  versuche es erneut."
- Sentence case, kein Filler, keine Emojis außer einem dezenten Gruß-Wink
  auf der Startseite (optional).

---

## 10. Qualitätsuntergrenze (gilt immer)

- Responsiv bis Mobile (die Referenz zeigt explizit eine Mobile-Ansicht —
  Sidebar wird zu Bottom-Nav/Drawer).
- Sichtbarer Tastatur-Fokus (Akzent-Ring), Bedienung per Tastatur möglich.
- `prefers-reduced-motion` respektieren.
- Ladezustände (Skeletons in Surface-2), nie weiße/leere Sprünge.
- Animationen sparsam: weiche Übergänge (150–200ms) auf Hover/Fokus/
  Theme-Wechsel. Keine Dauer-Animationen, kein Effekt-Feuerwerk.