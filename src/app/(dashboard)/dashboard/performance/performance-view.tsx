"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEUR, formatProzent } from "@/lib/format";
import { ChartCard } from "@/components/charts/chart-card";
import { GroupedBars, type BarSerie } from "@/components/charts/grouped-bars";
import { CHART } from "@/components/charts/tokens";
import { Pill } from "@/components/ui/pill";

type Period = "monat" | "quartal" | "jahr" | "gesamt";
type Metrik = "umsatz" | "reserviert" | "verbrieft" | "beide";

/** Einzelner realisierter Deal hinter der Umsatz-Zahl (Feedback SJ). */
export type PerfDealDetail = {
  dealId: string;
  dealname: string;
  bereich: "immobilien" | "vv";
  betrag: number;
  periode: { monat: boolean; quartal: boolean; jahr: boolean };
};

/** Deal hinter Reserviert/Verbrieft mit Status (Immobilien, Kaufpreis). */
export type RvDeal = {
  dealId: string;
  dealname: string;
  kaufpreis: number;
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

const METRIKEN: { k: Metrik; label: string }[] = [
  { k: "umsatz", label: "Umsatz" },
  { k: "reserviert", label: "Reserviert" },
  { k: "verbrieft", label: "Verbrieft" },
  { k: "beide", label: "Reserviert & Verbrieft" },
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
  const [metrik, setMetrik] = useState<Metrik>("umsatz");
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [openStruktur, setOpenStruktur] = useState<string | null>(null);

  // 5.5: Für einen Berater OHNE Downline zeigt „Umsatz pro Berater" nur ihn
  // selbst — ohne Mehrwert, also ausblenden.
  if (!isGf && rows.length <= 1) return null;

  // Diagramm-Serien je nach gewählter Metrik.
  const series: BarSerie[] =
    metrik === "beide"
      ? [
          { key: "reserviert", name: "Reserviert", color: CHART.info },
          { key: "verbrieft", name: "Verbrieft", color: CHART.success },
        ]
      : metrik === "reserviert"
        ? [{ key: "reserviert", name: "Reserviert", color: CHART.info }]
        : metrik === "verbrieft"
          ? [{ key: "verbrieft", name: "Verbrieft", color: CHART.success }]
          : [{ key: "umsatz", name: "Umsatz", color: "url(#groupedGold)" }];

  const metricVal = (r: PerfRow): number =>
    metrik === "umsatz"
      ? r.umsatz[period]
      : metrik === "verbrieft"
        ? r.verbrieft
        : r.reserviert; // reserviert + beide sortieren nach reserviert

  const strukturRows = [...rows].sort((a, b) => metricVal(b) - metricVal(a));
  const chartData = strukturRows.map((r) => ({
    label: r.name.split(" ")[0],
    umsatz: r.umsatz[period],
    reserviert: r.reserviert,
    verbrieft: r.verbrieft,
  }));
  const chartLeer = chartData.every(
    (d) =>
      Number(d.umsatz) === 0 &&
      Number(d.reserviert) === 0 &&
      Number(d.verbrieft) === 0,
  );

  const tableRows = [...rows].sort(
    (a, b) => b.umsatz[period] - a.umsatz[period],
  );

  return (
    <div className="space-y-4">
      <ChartCard
        title={isGf ? "Meine Struktur" : "Meine Struktur — pro Berater"}
        subtitle="Umsatz / Reserviert / Verbrieft je Berater — Kaufpreis-Volumen (Immobilien), Umsatz = Provision je Zeitraum"
        action={
          <div className="flex flex-wrap items-center justify-end gap-2">
            {/* Metrik-Umschalter (Call SJ): was zeigen die Säulen? */}
            <div className="flex gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5">
              {METRIKEN.map((m) => (
                <button
                  key={m.k}
                  type="button"
                  onClick={() => setMetrik(m.k)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                    metrik === m.k
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {/* Zeitraum nur relevant für Umsatz (Reserviert/Verbrieft kumulativ). */}
            {metrik === "umsatz" && (
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
            )}
          </div>
        }
      >
        {chartLeer ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Keine Daten in dieser Ansicht.
          </p>
        ) : (
          <GroupedBars data={chartData} series={series} />
        )}

        {/* Detail: je Berater aufklappbar — welche Deals ergeben die Zahl?
            (Feedback SJ: Detail direkt hier oben auswählbar). */}
        <div className="mt-4 border-t border-border pt-3">
          <ul className="space-y-0.5">
            {strukturRows.map((r) => (
              <StrukturZeile
                key={r.id}
                r={r}
                metrik={metrik}
                period={period}
                isGf={isGf}
                open={openStruktur === r.id}
                onToggle={() =>
                  setOpenStruktur((v) => (v === r.id ? null : r.id))
                }
              />
            ))}
          </ul>
        </div>
      </ChartCard>

      {/* Kennzahlen-Tabelle je Berater (alle KPIs, Umsatz aufklappbar) */}
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
                <RowGroup
                  key={r.id}
                  r={r}
                  period={period}
                  isGf={isGf}
                  open={openRow === r.id}
                  onToggle={() =>
                    setOpenRow((v) => (v === r.id ? null : r.id))
                  }
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Aufklappbare Struktur-Detailzeile: Deals hinter der gewählten Metrik. */
function StrukturZeile({
  r,
  metrik,
  period,
  isGf,
  open,
  onToggle,
}: {
  r: PerfRow;
  metrik: Metrik;
  period: Period;
  isGf: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const periodenDeals = r.deals.filter((d) =>
    period === "gesamt" ? true : d.periode[period],
  );
  return (
    <li>
      <div className="flex items-center justify-between gap-3 py-1 text-sm">
        <div className="flex min-w-0 items-center gap-1.5">
          {isGf ? (
            <Link
              href={`/dashboard/berater/${r.id}`}
              className="truncate font-medium text-primary hover:underline"
            >
              {r.name}
            </Link>
          ) : (
            <span className="truncate font-medium text-foreground">
              {r.name}
            </span>
          )}
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={`Deals von ${r.name}`}
            className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
            />
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-4 tabular-nums">
          {(metrik === "reserviert" || metrik === "beide") && (
            <span className="text-info">{formatEUR(r.reserviert)}</span>
          )}
          {(metrik === "verbrieft" || metrik === "beide") && (
            <span className="text-success">{formatEUR(r.verbrieft)}</span>
          )}
          {metrik === "umsatz" && (
            <span className="font-medium text-foreground">
              {formatEUR(r.umsatz[period])}
            </span>
          )}
        </div>
      </div>
      {open && (
        <ul className="mb-1 ml-4 mt-1 space-y-1 border-l border-border pl-3">
          {metrik === "umsatz" ? (
            periodenDeals.length === 0 ? (
              <li className="text-xs text-muted-foreground">
                Keine Abschlüsse in diesem Zeitraum.
              </li>
            ) : (
              periodenDeals.map((d) => (
                <li
                  key={d.dealId}
                  className="flex items-center justify-between gap-3 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate text-foreground">
                    {d.dealname}
                    <span className="text-muted-foreground">
                      {" "}
                      · {d.bereich === "immobilien" ? "Immobilien" : "VV"}
                    </span>
                  </span>
                  <span className="shrink-0 font-medium tabular-nums text-muted-foreground">
                    {formatEUR(d.betrag)}
                  </span>
                </li>
              ))
            )
          ) : r.rvDeals.length === 0 ? (
            <li className="text-xs text-muted-foreground">
              Keine reservierten Deals.
            </li>
          ) : (
            r.rvDeals.map((d) => (
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
                  <span className="w-24 text-right font-medium tabular-nums text-muted-foreground">
                    {formatEUR(d.kaufpreis)}
                  </span>
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </li>
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
