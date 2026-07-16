"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Calculator, Users, Wallet } from "lucide-react";
import { formatEUR } from "@/lib/format";
import { einschaetzungLabel, einschaetzungTone } from "@/config/enums";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { BarSeries } from "@/components/charts/bar-series";
import { Pill } from "@/components/ui/pill";
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
  /** 15.2: eingeschaetzt | nicht_finanzierbar (ausstehend wird ausgefiltert). */
  einschaetzung: string;
  betrag: number;
  /** „Bereits auf Objekt belegt" (15.2). */
  belegt: boolean;
};

const ALL = "__all";
const STATUS_FILTER = [
  { k: "eingeschaetzt", label: "Eingeschätzt" },
  { k: "nicht_finanzierbar", label: "Nicht finanzierbar" },
];

/**
 * Eingeschätzte Kunden (15.2) — NUR Immobilien. Anzahl + Gesamtvolumen +
 * Liste mit Ampel (eingeschätzt / nicht finanzierbar) + „auf Objekt belegt",
 * filterbar je Berater und Status. Der „Finanzierungsrahmen" ist entfallen —
 * es zählt allein die Einschätzung.
 */
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
  const [status, setStatus] = useState(ALL);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (berater !== ALL && r.beraterId !== berater) return false;
      if (status !== ALL && r.einschaetzung !== status) return false;
      return true;
    });
  }, [rows, berater, status]);

  // Volumen zählt nur die tatsächlich finanzierbaren Kunden (15.2).
  const finanzierbar = filtered.filter(
    (r) => r.einschaetzung === "eingeschaetzt",
  );
  const volumen = finanzierbar.reduce((s, r) => s + r.betrag, 0);
  const avg = finanzierbar.length ? volumen / finanzierbar.length : 0;

  const perBerater = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of finanzierbar)
      m.set(r.berater, (m.get(r.berater) ?? 0) + r.betrag);
    return [...m.entries()]
      .map(([name, value]) => ({ label: name.split(" ")[0], value }))
      .sort((a, b) => b.value - a.value);
  }, [finanzierbar]);

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
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Einschätzung" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Alle Einschätzungen</SelectItem>
            {STATUS_FILTER.map((b) => (
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
          label="Finanzierbare Kunden"
          value={String(finanzierbar.length)}
          icon={Users}
          tone="accent"
        />
        <KpiCard
          label="Finanzierbares Volumen"
          value={formatEUR(volumen)}
          icon={Wallet}
          tone="info"
        />
        <KpiCard
          label="Ø Finanzierbar bis"
          value={avg ? formatEUR(avg) : "—"}
          icon={Calculator}
          tone="success"
        />
      </div>

      {isGf && perBerater.length > 0 && (
        <ChartCard
          title="Finanzierbares Volumen pro Berater"
          subtitle="Summe der eingeschätzten Beträge (finanzierbar bis)"
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
              <th className="px-4 py-3 font-medium">Finanzierbar bis</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 ? (
              <tr>
                <td
                  colSpan={isGf ? 4 : 3}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Keine eingeschätzten Kunden für diese Filter.
                </td>
              </tr>
            ) : (
              tableRows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={`/kontakte/${r.id}`}
                      className="text-foreground transition-colors hover:text-primary hover:underline"
                    >
                      {r.name}
                    </Link>
                  </td>
                  {isGf && (
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.berater}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <Pill tone={einschaetzungTone(r.einschaetzung)}>
                      {einschaetzungLabel(r.einschaetzung)}
                    </Pill>
                  </td>
                  <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                    {r.einschaetzung === "eingeschaetzt"
                      ? formatEUR(r.betrag)
                      : "—"}
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
