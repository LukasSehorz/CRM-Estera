// Chart-Farben-Adapter für die bestehenden Chart-Komponenten. Kanonische
// Palette lebt in ./chart-colors.ts; hier nur die von den Komponenten
// erwartete CHART-Form. Alle Werte sind CSS-Variablen (theme-fest), keine
// festen Hex-Werte mehr — recharts/SVG akzeptiert "var(--x)" direkt.
import { CHART_ACCENT, CHART_AXIS, CHART_COLORS, CHART_STATUS } from "./chart-colors";

export const CHART = {
  // Primär-Serie (Linie/Fläche): theme-abhängig -> auf Light tief, auf Dark hell.
  primary: "var(--chart-1)",
  // Verlaufs-Endpunkte (ruhige Akzent-Familie, Stahlblau/Amber statt Gold-Hex).
  accent400: CHART_ACCENT.light,
  accent600: CHART_ACCENT.dark,
  // Statustöne.
  info: CHART_STATUS.info,
  success: CHART_STATUS.success,
  warning: CHART_STATUS.warning,
  danger: CHART_STATUS.danger,
  // Reihenfolge für Donut/Kategorien (theme-abhängige CSS-Variablen).
  palette: [...CHART_COLORS],
  // Achsen/Raster über CSS-Variablen (theme-abhängig).
  grid: CHART_AXIS.grid,
  axis: CHART_AXIS.axis,
};
