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
import { InfoHint } from "@/components/ui/info-hint";
import { UmsatzSparkline } from "@/components/charts/umsatz-sparkline";
import { bereichLabel } from "@/config/enums";
import type { Werte } from "./provision-block";

/* ──────────────────────────────────────────────────────────────────────
   Midnight-Dashboard-Karten (Redesign nach Referenz-Layout):
   Overview-Graph · Total-Balance mit Umsatz-Sparkline · Blick-nach-vorn ·
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

/** Karte 2 — Total Balance: Umsatz, Wachstum, gewonnene Deals + 3D-Muster. */
export function BalanceCard({
  umsatz30,
  mom,
  gewonnen,
  umsatzGesamt,
  serie = [],
  isGf,
  className,
  fromHref = "/dashboard",
}: {
  umsatz30: number;
  mom: number | null;
  gewonnen: number;
  umsatzGesamt: number;
  /** Tagesreihe der letzten 30 Tage für die Sparkline (statt Deko-Grafik). */
  serie?: { label: string; value: number }[];
  isGf: boolean;
  className?: string;
  /** Zurück-Ziel für Drill-downs (Feedback SJ): führt aufs Dashboard zurück. */
  fromHref?: string;
}) {
  // Leerzustand: keine Sparkline zeichnen, wenn in den letzten 30 Tagen
  // nichts abgeschlossen wurde — eine flache Nulllinie wäre irreführend.
  const hatUmsatz = serie.some((p) => p.value > 0);
  const from = `&from=${encodeURIComponent(fromHref)}`;
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-200 hover:border-accent-500/30 hover:shadow-[0_2px_12px_-4px_rgb(0_0_0/0.28)]",
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
        href={`/listen/deals?preset=verkauft${from}`}
        className="mt-3 inline-flex w-fit items-center gap-2 rounded-full border border-accent-500/30 bg-accent-500/10 px-3 py-1.5 text-xs font-semibold text-accent-400 transition-colors hover:bg-accent-500/20"
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
        {gewonnen} gewonnene Deals · {formatEUR(umsatzGesamt)} Gesamtumsatz
      </Link>

      {/* Sparkline Umsatz (30 Tage) — randlose Fläche statt Deko-Grafik */}
      <div className="mt-4 min-h-44 flex-1">
        {hatUmsatz ? (
          <UmsatzSparkline serie={serie} />
        ) : (
          <div className="flex h-full min-h-44 items-center justify-center text-center text-xs text-muted-foreground">
            Noch keine Abschlüsse in den letzten 30 Tagen
          </div>
        )}
      </div>
      <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-500 motion-reduce:animate-none" aria-hidden />
        Estera Intelligence — Zahlen aktualisieren sich live
      </p>
    </section>
  );
}

/** Karte 3 — Blick nach vorn: offene Pipeline, Provisionen, Einbehalte. */
export function ForecastCard({
  werte,
  offeneDeals,
  isGf,
  className,
  fromHref = "/dashboard",
}: {
  werte: Werte;
  offeneDeals: number;
  isGf: boolean;
  className?: string;
  fromHref?: string;
}) {
  const from = `&from=${encodeURIComponent(fromHref)}`;
  const rows = [
    {
      icon: TrendingUp,
      label: "Pipeline-Volumen (offen)",
      value: formatEUR(werte.volumen),
      href: `/listen/deals?preset=offen${from}`,
    },
    {
      icon: HandCoins,
      label: isGf ? "Erwartete Provision (Estera)" : "Erwartete Provision",
      value: formatEUR(werte.erwartet),
      href: `/listen/deals?preset=offen${from}`,
    },
    {
      icon: Hourglass,
      label: "Offene Einbehalte (VV)",
      value: werte.einbehalt > 0 ? formatEUR(werte.einbehalt) : "—",
      sub: werte.naechsteFaelligkeit
        ? `nächste Auszahlung ${formatDate(werte.naechsteFaelligkeit)}`
        : undefined,
      href: `/listen/deals?preset=einbehalt-offen${from}`,
    },
    {
      icon: Layers,
      label: "Offene Deals",
      value: String(offeneDeals),
      href: `/listen/deals?preset=offen${from}`,
    },
  ];
  return (
    <section
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-200 hover:border-accent-500/30 hover:shadow-[0_2px_12px_-4px_rgb(0_0_0/0.28)]",
        className,
      )}
    >
      <h2 className="text-base font-semibold">Blick nach vorn</h2>
      <p className="text-xs text-muted-foreground">
        Was in der offenen Pipeline steckt
      </p>

      {/* Hero: gewichtete Provision — ruhiger Akzent-Rahmen, kein Signalton
          (Forecast ist kein Fehler, daher kein Danger/Pink mehr). */}
      <div className="mt-4 rounded-xl border border-accent-500/25 bg-gradient-to-br from-accent-500/12 via-surface-2 to-surface p-4">
        <p className="flex items-center gap-1.5 text-xs font-medium text-accent-400">
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

      <ul className="mt-4 flex-1 space-y-1">
        {rows.map((r) => (
          <li key={r.label}>
            <Link
              href={r.href}
              className="-mx-2 flex items-start justify-between gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2"
            >
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
            </Link>
          </li>
        ))}
      </ul>

      <Link
        href={`/listen/deals?preset=offen${from}`}
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
        "flex flex-col rounded-2xl border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-200 hover:border-accent-500/30 hover:shadow-[0_2px_12px_-4px_rgb(0_0_0/0.28)]",
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
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
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
