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

type Point = { label: string; value: number };

function BarTooltip({
  active,
  payload,
  label,
  money,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs shadow-md">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-semibold tabular-nums text-foreground">
        {money ? formatEUR(payload[0].value) : payload[0].value}
      </div>
    </div>
  );
}

/** Balken mit Akzent-Verlauf & runden Kappen (z. B. Umsatz pro Berater). */
export function BarSeries({
  data,
  height = 260,
  money = true,
}: {
  data: Point[];
  height?: number;
  money?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="barSeriesFill" x1="0" y1="0" x2="0" y2="1">
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
          tickFormatter={(v) => (money ? formatKompakt(Number(v)) : String(v))}
        />
        <Tooltip
          content={<BarTooltip money={money} />}
          cursor={{ fill: "var(--surface-2)" }}
        />
        <Bar
          dataKey="value"
          radius={[6, 6, 0, 0]}
          fill="url(#barSeriesFill)"
          maxBarSize={52}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
