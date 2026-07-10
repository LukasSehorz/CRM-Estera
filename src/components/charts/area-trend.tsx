"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART } from "./tokens";
import { formatEUR, formatKompakt } from "@/lib/format";

type Point = { label: string; value: number };

function TrendTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs shadow-md">
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-semibold tabular-nums text-foreground">
        {formatEUR(payload[0].value)}
      </div>
    </div>
  );
}

/** Flächen-/Linien-Trend mit weichem Akzent-Verlauf (z. B. Umsatzentwicklung). */
export function AreaTrend({
  data,
  height = 260,
}: {
  data: Point[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 4, bottom: 0 }}>
        <defs>
          <linearGradient id="areaTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART.primary} stopOpacity={0.35} />
            <stop offset="100%" stopColor={CHART.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={CHART.grid} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          dy={6}
          tick={{ fill: CHART.axis, fontSize: 12 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={44}
          tick={{ fill: CHART.axis, fontSize: 12 }}
          tickFormatter={(v) => formatKompakt(Number(v))}
        />
        <Tooltip content={<TrendTooltip />} cursor={{ stroke: CHART.grid }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={CHART.primary}
          strokeWidth={2.5}
          fill="url(#areaTrendFill)"
          dot={false}
          activeDot={{
            r: 4,
            fill: CHART.primary,
            stroke: "var(--surface)",
            strokeWidth: 2,
          }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
