"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART } from "./tokens";
import { formatEUR, formatKompakt } from "@/lib/format";

export type BarSerie = { key: string; name: string; color: string };

function GroupedTooltip({
  active,
  payload,
  label,
  series,
}: {
  active?: boolean;
  payload?: { dataKey: string; value: number; fill: string }[];
  label?: string;
  series: BarSerie[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs shadow-md">
      <div className="mb-1 text-muted-foreground">{label}</div>
      <div className="space-y-0.5">
        {payload.map((p) => (
          <div
            key={p.dataKey}
            className="flex items-center justify-between gap-4"
          >
            <span className="flex items-center gap-1.5 text-foreground">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: p.fill }}
              />
              {series.find((s) => s.key === p.dataKey)?.name ?? p.dataKey}
            </span>
            <span className="font-semibold tabular-nums text-foreground">
              {formatEUR(p.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Gruppiertes Säulendiagramm: eine oder mehrere Serien nebeneinander je
 * Kategorie (z. B. Reserviert + Verbrieft je Berater). Gold-Verlauf bei einer
 * Serie, sonst die Serien-Farben.
 */
export function GroupedBars({
  data,
  series,
  height = 260,
}: {
  data: Record<string, number | string>[];
  series: BarSerie[];
  height?: number;
}) {
  const single = series.length === 1;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: 4, bottom: 0 }}
        barGap={4}
        barCategoryGap="24%"
      >
        <defs>
          <linearGradient id="groupedGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.accent400} />
            <stop offset="100%" stopColor={CHART.accent600} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={CHART.grid} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          dy={6}
          interval={0}
          tick={{ fill: CHART.axis, fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fill: CHART.axis, fontSize: 12 }}
          tickFormatter={(v) => formatKompakt(Number(v))}
        />
        <Tooltip
          content={<GroupedTooltip series={series} />}
          cursor={{ fill: "var(--surface-2)" }}
        />
        {series.map((s) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.name}
            fill={s.color}
            radius={[6, 6, 0, 0]}
            maxBarSize={single ? 52 : 26}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
