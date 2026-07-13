# White-Label / externe Vertriebe (V4.1 Kap. 10)

## Entscheidung: eigene Instanz je Vertrieb

Ein externer Vertrieb erhält eine **eigene Instanz** — eigenes Vercel/Netlify-
Deployment **und eigene Supabase-Datenbank**. Das ist die vom Dokument
bevorzugte, sicherste Variante: es gibt keinen gemeinsamen Datenbestand, aus
dem interne Estera-Werte durchschlagen könnten (Kap. 10: „lückenlose Trennung").

Bewusst **kein** Multi-Mandanten-System in einer einzigen Instanz — das würde
die Rechte-/RLS-Komplexität und das Leck-Risiko deutlich erhöhen, ohne echten
Vorteil (die Vertriebe teilen keine Daten).

## Branding pro Instanz — ein Schalter

Alles Marken-/Sichtbarkeits-Relevante liegt zentral in
[`src/config/branding.ts`](../src/config/branding.ts):

```ts
export const BRANDING = {
  appName: "Estera CRM",   // Firmenname
  claim:   "Vertriebs-CRM",
  company: "Estera GmbH",
  logoSrc: "/estera-logo.jpg", // Datei in /public tauschen
  whiteLabel: false,       // true = externe Instanz
};
```

Für eine externe Instanz:
1. `appName` / `claim` / `company` anpassen, `logoSrc`-Datei in `/public` tauschen,
2. `whiteLabel = true` setzen,
3. optional Farbtokens in `src/app/globals.css` überschreiben.

`BRANDING.appName` / `BrandMark` werden bereits überall aus dieser Konfig
gespeist (Sidebar, Mobile-Nav, Login, Favicon-Metadaten).

## Was in einer White-Label-Instanz ausgeblendet wird

`whiteLabel = true` bedeutet: `zeigeInterneWerte()` liefert `false`. Damit sind
auszublenden (Kap. 10):

- Estera-Branding · „CRM Lending"
- interne Berechnungen & interne Provisionssätze (7,8 %, Rechenkette)
- Stufen / Karriereleiter · Overhead · Einbehalte
- interne KPIs & interne Forecasts

Umsetzung beim Bau einer konkreten externen Instanz: an den betroffenen Blöcken
(z. B. `MeinEinkommen`, `SummenSkala`, GF-Signale, Karriere) auf
`zeigeInterneWerte()` prüfen und den Block bzw. die internen Zeilen weglassen.
Da eine externe Instanz eine eigene DB hat, existieren Stufen/Overhead dort in
der Regel ohnehin nicht — der Schalter ist die zusätzliche Absicherung.

## Dokumentenportal je externem Partner (Kap. 14.4)

Jede Instanz hat ihr eigenes Dokumentenportal (eigene Vorlagen/PDFs, eigenes
Logo) — technisch identisch zur Estera-Instanz, nur mit eigenen Inhalten. Die
Vorlagen-Bibliothek (`portal_documents`) ist pro Instanz/DB getrennt.

## Skalierung (Kap. 11) — bereits im Datenmodell vorgesehen

- **Hierarchie/Teamleiter:** `profiles.parent_berater_id` (eine Ebene) bildet die
  Downline ab; eine Teamleiter-Sicht kann darauf aufsetzen, ohne Umbau.
- **Suchbare/paginierte Tabellen:** Team-Verwaltung und Listen sind Tabellen
  (kein Balkenchart-Zwang bei > 30 Personen); Such-/Filterfelder sind vorhanden
  bzw. leicht ergänzbar.
