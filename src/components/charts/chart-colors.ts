// =====================================================================
// Estera CRM — recharts-Palette (Deliverable des Farbsystems)
// Ruhige Stahlblau-/Amber-Familie, abgestuft und in Light UND Dark lesbar.
//
// ALLES hier läuft über die theme-abhängigen CSS-Variablen aus globals.css
// (--chart-1..6, --accent-400/600, --success/--warning/--danger/--info,
// --border, --text-secondary). recharts akzeptiert "var(--x)" direkt als
// fill/stroke/stopColor im SVG — keine festen Hex-Werte mehr nötig
// (Kundenwunsch 26.07.: kein Neon/Cyan, keine hart kodierten Verläufe).
// =====================================================================

/** Kategoriale Chart-Palette — theme-abhängig (Reihenfolge = Serien-Index). */
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
] as const;

/** Verlaufs-Endpunkte für Balken-/Funnel-Gradients — ruhige Akzent-Familie
 *  (ersetzt die frühere feste Hex-Palette inkl. Neon-Cyan). */
export const CHART_ACCENT = {
  light: "var(--accent-400)",
  dark: "var(--accent-600)",
} as const;

/** Semantische Statustöne für Chart-Overlays — theme-abhängig, wie überall
 *  im Frontend (kein eigener, von den Layout-Tokens losgelöster Farbsatz). */
export const CHART_STATUS = {
  success: "var(--success)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  info: "var(--info)",
} as const;

/** Achsen/Raster ziehen ihre Farbe theme-abhängig aus den Layout-Tokens. */
export const CHART_AXIS = {
  grid: "var(--border)",
  axis: "var(--muted-foreground)",
} as const;
