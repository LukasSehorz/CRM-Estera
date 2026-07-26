"use client";

import { Area, AreaChart, ResponsiveContainer } from "recharts";

/**
 * Randlose Umsatz-Sparkline (30 Tage) für die Balance-Karte — ersetzt die
 * frühere Deko-Grafik durch echte Daten (Kundenwunsch 26.07.2026: keine
 * „spacigen" Zierbilder). Eigene Client-Komponente, damit die Karten in
 * midnight-cards.tsx Server-Komponenten bleiben (Recharts braucht Hooks).
 */
export function UmsatzSparkline({
  serie,
}: {
  serie: { label: string; value: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%" minHeight={176}>
      <AreaChart data={serie} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceSparklineFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-500)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--accent-500)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--accent-500)"
          strokeWidth={2}
          fill="url(#balanceSparklineFill)"
          dot={false}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
