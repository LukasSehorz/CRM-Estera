// =====================================================================
// Estera CRM — recharts-Palette (Deliverable des Farbsystems)
// Gold-Familie + Navy/Slate, abgestuft und in Light UND Dark lesbar.
//
// Kategoriale Serien (Donut, mehrere Reihen) nutzen die theme-abhängigen
// CSS-Variablen --chart-1..6 aus globals.css, damit sie in beiden Modi
// genug Kontrast haben (Dark: aufgehellt, Light: abgedunkelt). recharts
// akzeptiert "var(--x)" direkt als fill/stroke im SVG.
//
// Verlaufs-Endpunkte, die programmatisch gemischt werden (lerpHex) oder in
// einem <linearGradient><stop> sitzen, brauchen feste Hex — dafür CHART_HEX.
// =====================================================================

/** Kategoriale Chart-Palette — theme-abhängig (Reihenfolge = Serien-Index). */
export const CHART_COLORS = [
  "var(--chart-1)", // Gold tief (Light) / Gold (Dark)
  "var(--chart-2)", // Gold (Light) / Gold Soft (Dark)
  "var(--chart-3)", // Stahlblau
  "var(--chart-4)", // Teal
  "var(--chart-5)", // Slate
  "var(--chart-6)", // Bronze
] as const;

/** Feste Hex für Verläufe & lerpHex — Midnight-Redesign: Luna-Blau-Familie
 *  (Slots behalten ihre Namen, damit alle Verwender unverändert bleiben). */
export const CHART_HEX = {
  goldSoft: "#A7EBF2", // Luna Cyan hell
  gold: "#54ACBF", // Luna Steel-Cyan
  bronze: "#26658C", // Luna Tiefblau
  steel: "#5E86B5", // hsl(212 40% 54%)
  teal: "#3CA79A", // hsl(174 48% 44%)
  slate: "#8B93A6", // hsl(219 12% 60%)
} as const;

/** Semantische Statustöne für Chart-Overlays (mittlere Töne, beide Modi). */
export const CHART_STATUS = {
  success: "#2FA76E", // gewonnen / positive Rendite
  warning: "#D79A3A", // ins Stocken geraten
  danger: "#DB4E62", // verloren
  info: "#3F8FD0", // neutral
} as const;

/** Achsen/Raster ziehen ihre Farbe theme-abhängig aus den Layout-Tokens. */
export const CHART_AXIS = {
  grid: "var(--border)",
  axis: "var(--text-secondary)",
} as const;
