import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  Flame,
  HandCoins,
  Hourglass,
  Layers,
  Scale,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatEUR } from "@/lib/format";
import { Pill } from "@/components/ui/pill";
import { bereichLabel } from "@/config/enums";
import type { Werte } from "./provision-block";

/* ──────────────────────────────────────────────────────────────────────
   Midnight-Dashboard-Karten (Redesign nach Referenz-Layout):
   Overview-Graph · Total-Balance mit 3D-Muster · Blick-nach-vorn ·
   Aktuelle-Deals-Tabelle. Reine Präsentation — alle Zahlen kommen 1:1
   aus lib/analytics.
   ────────────────────────────────────────────────────────────────────── */

function DeltaPill({ value }: { value: number | null }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
        up ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
      )}
    >
      {up ? (
        <ArrowUpRight className="h-3 w-3" aria-hidden />
      ) : (
        <ArrowDownRight className="h-3 w-3" aria-hidden />
      )}
      {up ? "+" : ""}
      {value.toFixed(2).replace(".", ",")} %
    </span>
  );
}

/**
 * ?-Tooltip (5.1): CSS-only, per Hover UND Tastatur-Fokus sichtbar —
 * kein zusätzliches Paket, keine Portal-Logik nötig.
 */
function InfoHint({ text }: { text: string }) {
  return (
    <span className="group/info relative inline-flex">
      <button
        type="button"
        aria-label="Erklärung anzeigen"
        className="grid h-4 w-4 place-items-center rounded-full border border-current text-[9px] font-bold leading-none opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ?
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 w-60 -translate-x-1/2 rounded-lg border border-border bg-surface p-2.5 text-left text-[11px] font-normal leading-relaxed text-foreground opacity-0 shadow-xl transition-opacity duration-150 group-focus-within/info:opacity-100 group-hover/info:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}

/** Karte 2 — Total Balance: Umsatz, Wachstum, gewonnene Deals + 3D-Muster. */
export function BalanceCard({
  umsatz30,
  mom,
  gewonnen,
  umsatzGesamt,
  isGf,
  className,
}: {
  umsatz30: number;
  mom: number | null;
  gewonnen: number;
  umsatzGesamt: number;
  isGf: boolean;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-300 hover:border-accent-500/40 hover:shadow-[0_0_36px_-10px_color-mix(in_srgb,var(--accent-500)_45%,transparent)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">
            {isGf ? "Umsatz (letzte 30 Tage)" : "Meine Provision (30 Tage)"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Provision aus gewonnenen Deals — live aus deinem CRM
          </p>
        </div>
        <span className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs font-semibold text-muted-foreground">
          EUR €
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <p className="text-[2.6rem] font-bold leading-none tabular-nums tracking-tight">
          {formatEUR(umsatz30)}
        </p>
        <div className="flex flex-col gap-1">
          <DeltaPill value={mom} />
          {mom != null && (
            <span className="text-[10px] text-muted-foreground">
              vs. 30 Tage davor
            </span>
          )}
        </div>
      </div>

      <Link
        href="/listen/deals?preset=verkauft"
        className="mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-accent-500/30 bg-accent-500/10 px-3 py-1.5 text-xs font-semibold text-accent-400 transition-colors hover:bg-accent-500/20"
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        {gewonnen} gewonnene Deals · {formatEUR(umsatzGesamt)} Gesamtumsatz
      </Link>

      {/* 3D-Muster (Kie AI / GPT-Image-2) — exakt im Look der Referenz */}
      <div className="relative mt-4 min-h-44 flex-1 overflow-hidden rounded-xl border border-border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/dashboard/balance-pattern.png"
          alt=""
          aria-hidden
          className="absolute inset-0 h-full w-full object-cover object-right"
        />
        <div className="absolute inset-x-0 bottom-0 flex items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-4 pb-3 pt-8 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pop motion-reduce:animate-none" aria-hidden />
          Estera Intelligence — Zahlen aktualisieren sich live
        </div>
      </div>
    </section>
  );
}

/** Karte 3 — Blick nach vorn: offene Pipeline, Provisionen, Einbehalte. */
export function ForecastCard({
  werte,
  offeneDeals,
  isGf,
  className,
}: {
  werte: Werte;
  offeneDeals: number;
  isGf: boolean;
  className?: string;
}) {
  const rows = [
    {
      icon: TrendingUp,
      label: "Pipeline-Volumen (offen)",
      value: formatEUR(werte.volumen),
    },
    {
      icon: HandCoins,
      label: isGf ? "Erwartete Provision (Estera)" : "Erwartete Provision",
      value: formatEUR(werte.erwartet),
    },
    {
      icon: Hourglass,
      label: "Offene Einbehalte (VV)",
      value: werte.einbehalt > 0 ? formatEUR(werte.einbehalt) : "—",
      sub: werte.naechsteFaelligkeit
        ? `nächste Auszahlung ${formatDate(werte.naechsteFaelligkeit)}`
        : undefined,
    },
    {
      icon: Layers,
      label: "Offene Deals",
      value: String(offeneDeals),
    },
  ];
  return (
    <section
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-300 hover:border-accent-500/40 hover:shadow-[0_0_36px_-10px_color-mix(in_srgb,var(--accent-500)_45%,transparent)]",
        className,
      )}
    >
      <h2 className="text-base font-semibold">Blick nach vorn</h2>
      <p className="text-xs text-muted-foreground">
        Was in der offenen Pipeline steckt
      </p>

      {/* Hero: gewichtete Provision — beim GF mit dem Ziel-Pink der
          Berater-Monatsziele als Rahmenakzent (Wunsch). */}
      <div
        className={cn(
          "mt-4 rounded-xl border p-4",
          isGf
            ? "border-danger/40 bg-gradient-to-br from-danger/15 via-surface-2 to-surface"
            : "border-accent-500/25 bg-gradient-to-br from-accent-500/15 via-surface-2 to-surface",
        )}
      >
        <p
          className={cn(
            "flex items-center gap-1.5 text-xs font-medium",
            isGf ? "text-danger" : "text-accent-400",
          )}
        >
          <Scale className="h-3.5 w-3.5" aria-hidden />
          Forecast
          <InfoHint text="Jeder offene Deal zählt mit der Wahrscheinlichkeit seiner Phase: 500.000 € in einer 60-%-Phase fließen mit 300.000 € ein. Die Summe ist der realistische Forecast." />
        </p>
        <p className="mt-2 bg-cyan-pink-gradient bg-clip-text text-3xl font-bold tabular-nums tracking-tight text-transparent">
          {formatEUR(werte.gewichtet)}
        </p>
        <p className="mt-1 text-[10px] text-muted-foreground">
          nach Phasen-Wahrscheinlichkeit
        </p>
      </div>

      <ul className="mt-4 flex-1 space-y-3">
        {rows.map((r) => (
          <li key={r.label} className="flex items-start justify-between gap-2">
            <span className="flex items-center gap-2 text-xs text-muted-foreground">
              <r.icon className="h-3.5 w-3.5 shrink-0 text-accent-500" aria-hidden />
              {r.label}
            </span>
            <span className="text-right">
              <span className="block text-sm font-semibold tabular-nums">
                {r.value}
              </span>
              {r.sub && (
                <span className="block text-[10px] text-muted-foreground">
                  {r.sub}
                </span>
              )}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href="/listen/deals?preset=offen"
        className="mt-4 block rounded-lg bg-accent-500 px-4 py-2.5 text-center text-sm font-semibold text-background transition-colors hover:bg-accent-400"
      >
        Zur offenen Pipeline
      </Link>
    </section>
  );
}

type DealRow = {
  id: string;
  dealname: string;
  bereich: "immobilien" | "vv";
  created_at: string;
  stageName: string;
  betrag: number;
};

/** Karte 4 — Aktuelle Deals als Tabelle (Referenz „Popular Campaigns“). */
export function DealsCard({
  deals,
  className,
}: {
  deals: DealRow[];
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-300 hover:border-accent-500/40 hover:shadow-[0_0_36px_-10px_color-mix(in_srgb,var(--accent-500)_45%,transparent)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Aktuelle Deals</h2>
          <p className="text-xs text-muted-foreground">
            Zuletzt angelegte offene Deals
          </p>
        </div>
        <Link
          href="/listen/deals?preset=offen"
          className="rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Alle ansehen
        </Link>
      </div>

      {deals.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Noch keine offenen Deals.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2 pr-3 font-medium">Rang</th>
                <th className="pb-2 pr-3 font-medium">Deal</th>
                <th className="hidden pb-2 pr-3 font-medium md:table-cell">
                  Angelegt
                </th>
                <th className="hidden pb-2 pr-3 font-medium sm:table-cell">
                  Bereich
                </th>
                <th className="pb-2 pr-3 text-right font-medium">Betrag</th>
                <th className="pb-2 font-medium" aria-label="Aktion" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {deals.map((d, i) => {
                const topDeal =
                  d.betrag > 0 &&
                  d.betrag === Math.max(...deals.map((x) => x.betrag));
                return (
                <tr key={d.id} className="group">
                  <td className="py-3 pr-3 text-xs tabular-nums text-muted-foreground">
                    #{i + 1}
                  </td>
                  <td className="max-w-52 py-3 pr-3">
                    <span className="flex items-center gap-1.5 truncate font-medium">
                      <span className="truncate">{d.dealname}</span>
                      {topDeal && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-pop/15 px-1.5 py-0.5 text-[10px] font-semibold text-pop">
                          <Flame className="h-3 w-3" aria-hidden />
                          Top-Deal
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {d.stageName}
                    </span>
                  </td>
                  <td className="hidden py-3 pr-3 text-xs tabular-nums text-muted-foreground md:table-cell">
                    {formatDate(d.created_at)}
                  </td>
                  <td className="hidden py-3 pr-3 sm:table-cell">
                    <Pill tone={d.bereich === "vv" ? "info" : "accent"}>
                      {bereichLabel(d.bereich)}
                    </Pill>
                  </td>
                  <td className="py-3 pr-3 text-right font-semibold tabular-nums">
                    {formatEUR(d.betrag)}
                  </td>
                  <td className="py-3 text-right">
                    <Link
                      href={`/deals/${d.id}`}
                      className="inline-block rounded-full border border-accent-500/40 px-3.5 py-1 text-xs font-semibold text-accent-400 transition-colors hover:bg-accent-500 hover:text-background"
                    >
                      Öffnen
                    </Link>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
