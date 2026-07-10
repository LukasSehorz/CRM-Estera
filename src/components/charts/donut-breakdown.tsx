"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { CHART } from "./tokens";
import { formatEUR } from "@/lib/format";

type Slice = { name: string; value: number };

/** Donut mit Gesamtwert in der Mitte + Legende (z. B. Umsatz nach Quelle). */
export function DonutBreakdown({
  data,
  centerValue,
  money = true,
}: {
  data: Slice[];
  centerValue: string;
  money?: boolean;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Noch keine Daten.
      </p>
    );
  }

  return (
    <div className="flex min-w-0 flex-col items-center gap-5 sm:flex-row">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={84}
              paddingAngle={2}
              stroke="none"
              startAngle={90}
              endAngle={-270}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART.palette[i % CHART.palette.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <div className="text-lg font-bold tabular-nums">{centerValue}</div>
            <div className="text-[11px] text-muted-foreground">Gesamt</div>
          </div>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-2 text-sm">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: CHART.palette[i % CHART.palette.length] }}
              />
              <span className="truncate">{d.name}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {money ? formatEUR(d.value) : d.value}
              <span className="ml-1.5 text-xs">
                {Math.round((d.value / total) * 100)}%
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
