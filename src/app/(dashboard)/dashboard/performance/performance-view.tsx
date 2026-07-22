"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEUR, formatProzent, formatDate } from "@/lib/format";
import { ChartCard } from "@/components/charts/chart-card";
import { GroupedBars, type BarSerie } from "@/components/charts/grouped-bars";
import { CHART } from "@/components/charts/tokens";
import { Pill } from "@/components/ui/pill";

type Period = "monat" | "quartal" | "jahr" | "gesamt";

/** Einzelner realisierter Deal hinter der Umsatz-Zahl (Feedback SJ). */
export type PerfDealDetail = {
  dealId: string;
  dealname: string;
  bereich: "immobilien" | "vv";
  betrag: number;
  periode: { monat: boolean; quartal: boolean; jahr: boolean };
};

/** Deal hinter Reserviert/Verbrieft mit Status + Datum (Immobilien, Kaufpreis). */
export type RvDeal = {
  dealId: string;
  dealname: string;
  kaufpreis: number;
  datum: string | null;
  status: "reserviert" | "verbrieft" | "abgeschlossen";
};

export type PerfRow = {
  id: string;
  name: string;
  /** Sichtbare Sparten des Beraters — steuert, ob Immo/VV überhaupt erscheint. */
  bereich: ("immobilien" | "vv")[];
  offene: number;
  avgDealGroesse: number;
  dealTime: number | null;
  closing: number | null;
  storno: number | null;
  umsatz: Record<Period, number>;
  umsatzImmo: Record<Period, number>;
  umsatzVv: Record<Period, number>;
  provision: Record<Period, number>;
  deals: PerfDealDetail[];
  /** Reserviert/Verbrieft (Kaufpreis-Volumen, Immobilien, kumulativ). */
  reserviert: number;
  verbrieft: number;
  rvDeals: RvDeal[];
};

const PERIODS: { k: Period; label: string }[] = [
  { k: "monat", label: "Monat" },
  { k: "quartal", label: "Quartal" },
  { k: "jahr", label: "Jahr" },
  { k: "gesamt", label: "Gesamt" },
];

const STATUS_PILL: Record<
  RvDeal["status"],
  { label: string; tone: "info" | "accent" | "success" }
> = {
  reserviert: { label: "Reserviert", tone: "info" },
  verbrieft: { label: "Verbrieft", tone: "accent" },
  abgeschlossen: { label: "Abgeschlossen", tone: "success" },
};

export function PerformanceView({
  rows,
  isGf = false,
}: {
  rows: PerfRow[];
  isGf?: boolean;
}) {
  const [period, setPeriod] = useState<Period>("gesamt");
  const [openRow, setOpenRow] = useState<string | null>(null); // KPI-Tabelle
  const [openRv, setOpenRv] = useState<string | null>(null); // Reserviert/Verbrieft

  // 5.5: Für einen Berater OHNE Downline zeigt die Struktur nur ihn selbst.
  if (!isGf && rows.length <= 1) return null;

  // ── Sektion A: Umsatz pro Berater ──────────────────────────────────────
  const umsatzRows = [...rows].sort((a, b) => b.umsatz[period] - a.umsatz[period]);
  const umsatzData = umsatzRows.map((r) => ({
    label: r.name.split(" ")[0],
    umsatz: r.umsatz[period],
  }));
  const umsatzLeer = umsatzData.every((d) => Number(d.umsatz) === 0);
  const umsatzSeries: BarSerie[] = [
    { key: "umsatz", name: "Umsatz", color: "url(#groupedGold)" },
  ];

  // ── Sektion B: Reserviert & Verbrieft ──────────────────────────────────
  const rvRows = [...rows].sort((a, b) => b.reserviert - a.reserviert);
  const rvData = rvRows.map((r) => ({
    label: r.name.split(" ")[0],
    reserviert: r.reserviert,
    verbrieft: r.verbrieft,
  }));
  const rvLeer = rvData.every(
    (d) => Number(d.reserviert) === 0 && Number(d.verbrieft) === 0,
  );
  const rvSeries: BarSerie[] = [
    { key: "reserviert", name: "Reserviert", color: CHART.info },
    { key: "verbrieft", name: "Verbrieft", color: CHART.success },
  ];

  return (
    <div className="space-y-4">
      {/* ── Umsatz pro Berater: Diagramm + KPI-Tabelle ── */}
      <ChartCard
        title={isGf ? "Umsatz pro Berater" : "Meine Struktur — Umsatz pro Berater"}
        subtitle="Eigene Provision je Zeitraum"
        action={
          <div className="flex gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5">
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
        {umsatzLeer ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Keine Umsätze in diesem Zeitraum.
          </p>
        ) : (
          <GroupedBars data={umsatzData} series={umsatzSeries} />
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
            {umsatzRows.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Keine Daten.
                </td>
              </tr>
            ) : (
              umsatzRows.map((r) => (
                <RowGroup
                  key={r.id}
                  r={r}
                  period={period}
                  isGf={isGf}
                  open={openRow === r.id}
                  onToggle={() => setOpenRow((v) => (v === r.id ? null : r.id))}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Reserviert & Verbrieft: Diagramm + eigene Tabelle ── */}
      {!rvLeer && (
        <>
          <ChartCard
            title="Reserviert & Verbrieft"
            subtitle="Kaufpreis-Volumen (Immobilien) — kumulativ (Verbrieft ⊆ Reserviert)"
          >
            <GroupedBars data={rvData} series={rvSeries} />
          </ChartCard>

          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Berater</th>
                  <th className="px-4 py-3 font-medium">Reserviert</th>
                  <th className="px-4 py-3 font-medium">Verbrieft</th>
                </tr>
              </thead>
              <tbody>
                {rvRows.map((r) => (
                  <RvRow
                    key={r.id}
                    r={r}
                    isGf={isGf}
                    open={openRv === r.id}
                    onToggle={() => setOpenRv((v) => (v === r.id ? null : r.id))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

/** Zeile der Reserviert/Verbrieft-Tabelle — aufklappbar mit Deals + Datum. */
function RvRow({
  r,
  isGf,
  open,
  onToggle,
}: {
  r: PerfRow;
  isGf: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr
        className={cn(
          "border-b border-border last:border-0",
          open && "bg-surface-2/40",
        )}
      >
        <td className="px-4 py-3 font-medium text-foreground">
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
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="-mx-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium tabular-nums text-info transition-colors hover:bg-surface-2"
          >
            {formatEUR(r.reserviert)}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
        </td>
        <td className="px-4 py-3 font-medium tabular-nums text-success">
          {formatEUR(r.verbrieft)}
        </td>
      </tr>
      {open && (
        <tr className="border-b border-border bg-surface-2/40">
          <td colSpan={3} className="px-4 pb-3">
            {r.rvDeals.length === 0 ? (
              <p className="ml-1 text-xs text-muted-foreground">
                Keine reservierten Deals.
              </p>
            ) : (
              <ul className="ml-1 space-y-1">
                {r.rvDeals.map((d) => (
                  <li
                    key={d.dealId}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {d.dealname}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <Pill tone={STATUS_PILL[d.status].tone}>
                        {STATUS_PILL[d.status].label}
                      </Pill>
                      <span className="w-20 text-right tabular-nums text-muted-foreground">
                        {d.datum ? formatDate(d.datum) : "—"}
                      </span>
                      <span className="w-24 text-right font-medium tabular-nums text-muted-foreground">
                        {formatEUR(d.kaufpreis)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * Tabellenzeile mit aufklappbarer Umsatz-Aufschlüsselung (2.6): Klick auf die
 * Umsatz-Zahl zeigt, wie sie sich zusammensetzt (Immobilien / VV) und welche
 * Provision der Berater daraus erzielt hat.
 */
function RowGroup({
  r,
  period,
  isGf,
  open,
  onToggle,
}: {
  r: PerfRow;
  period: Period;
  isGf: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const immo = r.umsatzImmo[period];
  const vv = r.umsatzVv[period];
  const prov = r.provision[period];
  const zeigtImmo = r.bereich.includes("immobilien");
  const zeigtVv = r.bereich.includes("vv");
  const spaltenAnzahl = 1 + (zeigtImmo ? 1 : 0) + (zeigtVv ? 1 : 0);
  const periodenDeals = r.deals.filter((d) =>
    period === "gesamt" ? true : d.periode[period],
  );
  return (
    <>
      <tr
        className={cn(
          "border-b border-border last:border-0",
          open && "bg-surface-2/40",
        )}
      >
        <td className="px-4 py-3 font-medium text-foreground">
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
        <td className="px-4 py-3">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            className="-mx-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium tabular-nums text-foreground transition-colors hover:bg-surface-2 hover:text-primary"
          >
            {formatEUR(r.umsatz[period])}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground transition-transform",
                open && "rotate-180",
              )}
            />
          </button>
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
      {open && (
        <tr className="border-b border-border bg-surface-2/40">
          <td colSpan={7} className="px-4 pb-3">
            <div
              className={cn(
                "ml-1 grid gap-2",
                spaltenAnzahl === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
              )}
            >
              {zeigtImmo && (
                <Breakdown label="Umsatz Immobilien" value={immo} tone="primary" />
              )}
              {zeigtVv && <Breakdown label="Umsatz VV" value={vv} tone="info" />}
              <Breakdown
                label={isGf ? "Provision (Berater-Anteil)" : "Deine Provision"}
                value={prov}
                tone="success"
              />
            </div>
            {periodenDeals.length > 0 && (
              <div className="ml-1 mt-2 rounded-lg border border-border bg-surface p-3">
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                  {periodenDeals.length} Abschl
                  {periodenDeals.length === 1 ? "uss" : "üsse"} in diesem Zeitraum
                </p>
                <ul className="space-y-1">
                  {periodenDeals.map((d) => (
                    <li
                      key={d.dealId}
                      className="flex items-center justify-between gap-3 text-xs"
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {d.dealname}
                        <span className="text-muted-foreground">
                          {" "}
                          · {d.bereich === "immobilien" ? "Immobilien" : "VV"}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {formatEUR(d.betrag)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

const BREAK_TONE = {
  primary: "text-primary",
  info: "text-info",
  success: "text-success",
} as const;

function Breakdown({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: keyof typeof BREAK_TONE;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-sm font-semibold tabular-nums", BREAK_TONE[tone])}>
        {formatEUR(value)}
      </p>
    </div>
  );
}
