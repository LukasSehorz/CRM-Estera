"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Calculator, Users, Wallet } from "lucide-react";
import { formatEUR } from "@/lib/format";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { BarSeries } from "@/components/charts/bar-series";
import { Pill, einschaetzungStatusTone } from "@/components/ui/pill";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type EingRow = {
  id: string;
  name: string;
  beraterId: string;
  berater: string;
  status: string | null;
  betrag: number;
  rahmen: number;
};

const ALL = "__all";
const BUCKETS: { k: string; label: string; min: number; max: number }[] = [
  { k: "u250", label: "Bis 250k", min: 0, max: 250000 },
  { k: "250-350", label: "250–350k", min: 250000, max: 350000 },
  { k: "350-500", label: "350–500k", min: 350000, max: 500000 },
  { k: "500-700", label: "500–700k", min: 500000, max: 700000 },
  { k: "700plus", label: "700k+", min: 700000, max: Infinity },
];

export function EingeschaetztView({
  rows,
  beraterOptions,
  isGf,
}: {
  rows: EingRow[];
  beraterOptions: { id: string; name: string }[];
  isGf: boolean;
}) {
  const [berater, setBerater] = useState(ALL);
  const [rahmen, setRahmen] = useState(ALL);

  const filtered = useMemo(() => {
    const bucket = BUCKETS.find((b) => b.k === rahmen);
    return rows.filter((r) => {
      if (berater !== ALL && r.beraterId !== berater) return false;
      if (bucket && !(r.rahmen >= bucket.min && r.rahmen < bucket.max))
        return false;
      return true;
    });
  }, [rows, berater, rahmen]);

  const volumen = filtered.reduce((s, r) => s + r.betrag, 0);
  const avg = filtered.length ? volumen / filtered.length : 0;

  const perBerater = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of filtered)
      m.set(r.berater, (m.get(r.berater) ?? 0) + r.betrag);
    return [...m.entries()]
      .map(([name, value]) => ({ label: name.split(" ")[0], value }))
      .sort((a, b) => b.value - a.value);
  }, [filtered]);

  const tableRows = [...filtered].sort((a, b) => b.betrag - a.betrag);

  return (
    <div className="space-y-6">
      {/* Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {isGf && (
          <Select value={berater} onValueChange={setBerater}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder="Berater" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Alle Berater</SelectItem>
              {beraterOptions.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={rahmen} onValueChange={setRahmen}>
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Finanzierungsrahmen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Alle Rahmen</SelectItem>
            {BUCKETS.map((b) => (
              <SelectItem key={b.k} value={b.k}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Eingeschätzte Kunden"
          value={String(filtered.length)}
          icon={Users}
          tone="accent"
        />
        <KpiCard
          label="Qualifiziertes Volumen"
          value={formatEUR(volumen)}
          icon={Wallet}
          tone="info"
        />
        <KpiCard
          label="Ø Eingeschätzter Betrag"
          value={avg ? formatEUR(avg) : "—"}
          icon={Calculator}
          tone="success"
        />
      </div>

      {isGf && perBerater.length > 0 && (
        <ChartCard
          title="Qualifiziertes Volumen pro Berater"
          subtitle="Summe eingeschätzter Beträge"
        >
          <BarSeries data={perBerater} height={220} />
        </ChartCard>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Kunde</th>
              {isGf && <th className="px-4 py-3 font-medium">Berater</th>}
              <th className="px-4 py-3 font-medium">Einschätzung</th>
              <th className="px-4 py-3 font-medium">Eingeschätzter Betrag</th>
              <th className="px-4 py-3 font-medium">Finanzierungsrahmen</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 ? (
              <tr>
                <td
                  colSpan={isGf ? 5 : 4}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Keine eingeschätzten Kunden für diese Filter.
                </td>
              </tr>
            ) : (
              tableRows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {r.name}
                  </td>
                  {isGf && (
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.berater}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Pill tone={einschaetzungStatusTone(r.status)}>
                      {r.status ?? "—"}
                    </Pill>
                  </td>
                  <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      {formatEUR(r.betrag)}
                      {/* Plausibilität (Schleife 2, 1.6): Betrag über dem Rahmen */}
                      {r.rahmen > 0 && r.betrag > r.rahmen && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning"
                          title="Eingeschätzter Betrag liegt über dem Finanzierungsrahmen — Eingabe prüfen."
                        >
                          <AlertTriangle className="h-3 w-3" />
                          über Rahmen
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {formatEUR(r.rahmen)}
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
