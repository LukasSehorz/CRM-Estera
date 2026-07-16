"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatEUR, formatProzent } from "@/lib/format";
import { ChartCard } from "@/components/charts/chart-card";
import { BarSeries } from "@/components/charts/bar-series";

type Period = "monat" | "quartal" | "jahr" | "gesamt";

export type PerfRow = {
  id: string;
  name: string;
  offene: number;
  avgDealGroesse: number;
  dealTime: number | null;
  closing: number | null;
  storno: number | null;
  umsatz: Record<Period, number>;
};

const PERIODS: { k: Period; label: string }[] = [
  { k: "monat", label: "Monat" },
  { k: "quartal", label: "Quartal" },
  { k: "jahr", label: "Jahr" },
  { k: "gesamt", label: "Gesamt" },
];

export function PerformanceView({
  rows,
  isGf = false,
}: {
  rows: PerfRow[];
  isGf?: boolean;
}) {
  const [period, setPeriod] = useState<Period>("gesamt");

  const bar = rows
    .map((r) => ({ label: r.name.split(" ")[0], value: r.umsatz[period] }))
    .sort((a, b) => b.value - a.value);
  const tableRows = [...rows].sort(
    (a, b) => b.umsatz[period] - a.umsatz[period],
  );

  // 5.5: Für einen Berater OHNE Downline zeigt „Umsatz pro Berater" nur ihn
  // selbst — ohne Mehrwert, also ausblenden. Mit Downline (RLS liefert
  // sich + Struktur) wird es die eigene Struktur-Ansicht.
  if (!isGf && rows.length <= 1) return null;

  return (
    <div className="space-y-4">
      <ChartCard
        title={isGf ? "Umsatz pro Berater" : "Meine Struktur — Umsatz pro Berater"}
        subtitle="Gewonnene Deals"
        action={
          <div className="flex gap-1 rounded-lg border border-border bg-surface-2 p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.k}
                type="button"
                onClick={() => setPeriod(p.k)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  period === p.k
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        }
      >
        {bar.every((b) => b.value === 0) ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Kein Umsatz in diesem Zeitraum.
          </p>
        ) : (
          <BarSeries data={bar} />
        )}
      </ChartCard>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Berater</th>
              <th className="px-4 py-3 font-medium">Umsatz</th>
              <th className="px-4 py-3 font-medium">Offene Deals</th>
              <th className="px-4 py-3 font-medium">Ø Deal-Größe</th>
              <th className="px-4 py-3 font-medium">Ø Deal-Time</th>
              <th className="px-4 py-3 font-medium">Closing Rate</th>
              <th className="px-4 py-3 font-medium">Stornoquote</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Keine Daten.
                </td>
              </tr>
            ) : (
              tableRows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {/* Drilldown (Wunsch B): nur die GF darf in fremde Zahlen */}
                    {isGf ? (
                      <Link
                        href={`/dashboard/berater/${r.id}`}
                        className="text-primary hover:underline"
                      >
                        {r.name}
                      </Link>
                    ) : (
                      r.name
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                    {formatEUR(r.umsatz[period])}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{r.offene}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {r.avgDealGroesse ? formatEUR(r.avgDealGroesse) : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {r.dealTime != null ? `${Math.round(r.dealTime)} Tage` : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {r.closing != null ? formatProzent(r.closing, 0) : "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {r.storno != null ? formatProzent(r.storno, 0) : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
