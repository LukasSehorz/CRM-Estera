// Chart-Farben-Adapter für die bestehenden Chart-Komponenten. Kanonische
// Palette lebt in ./chart-colors.ts; hier nur die von den Komponenten
// erwartete CHART-Form + lerpHex für den Funnel-Verlauf.
import { CHART_AXIS, CHART_COLORS, CHART_HEX, CHART_STATUS } from "./chart-colors";

export const CHART = {
  // Primär-Serie (Linie/Fläche): theme-abhängig -> auf Light tief, auf Dark hell.
  primary: "var(--chart-1)",
  // Verlaufs-Endpunkte (Gold-Familie, feste Hex für <stop> & lerpHex).
  accent400: CHART_HEX.goldSoft,
  accent600: CHART_HEX.bronze,
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

/** Zwei Hex-Farben linear mischen (t=0..1). Für den Funnel-Verlauf. */
export function lerpHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const p = pa.map((x, i) => Math.round(x + (pb[i] - x) * t));
  return `#${p.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}
