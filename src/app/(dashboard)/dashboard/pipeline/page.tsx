import { CheckCircle2, Percent, Timer, TrendingUp } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { formatEUR, formatProzent } from "@/lib/format";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { PipelineFunnel } from "@/components/charts/pipeline-funnel";
import { BarSeries } from "@/components/charts/bar-series";
import { bereichLabel } from "@/config/enums";
import { DashboardTabs } from "../dashboard-tabs";
import { BereichSwitcher } from "../bereich-switcher";
import {
  loadAnalytics,
  scopeToBereich,
  resolveScope,
  erlaubteScopes,
  pipelineVolumen,
  funnelFor,
  conversionRates,
  dealTimeTage,
  closingRate,
  betragOf,
  isOpen,
  isWon,
  type FunnelStep,
  type AnalyticsData,
} from "@/lib/analytics";

function KonversionCard({
  title,
  funnel,
}: {
  title: string;
  funnel: FunnelStep[];
}) {
  const conv = conversionRates(funnel);
  return (
    <ChartCard title={title} subtitle="Übergang zwischen den Phasen">
      {conv.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Keine Daten.
        </p>
      ) : (
        <ul className="space-y-2 text-sm">
          {conv.map((c) => (
            <li key={`${c.from}-${c.to}`} className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-muted-foreground">
                {c.from} → {c.to}
              </span>
              <span className="h-1.5 w-24 overflow-hidden rounded-full bg-secondary">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${Math.round(c.rate * 100)}%` }}
                />
              </span>
              <span className="w-12 text-right font-medium tabular-nums">
                {formatProzent(c.rate, 0)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}

/** Raten bei "Gesamt" NIE mischen — je Bereich getrennt ausweisen (Wunsch A). */
function ratenWert(
  aFull: AnalyticsData,
  bereiche: ("immobilien" | "vv")[],
  rechne: (a: AnalyticsData) => number | null,
  fmt: (v: number) => string,
): string {
  const teile = bereiche.map((b) => {
    const v = rechne(scopeToBereich(aFull, b));
    return v != null ? fmt(v) : "—";
  });
  return teile.join(" / ");
}

export default async function PipelineDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ bereich?: string }>;
}) {
  const { bereich: rawBereich } = await searchParams;
  const aFull = await loadAnalytics();
  const scope = resolveScope(aFull, rawBereich);
  const a = scopeToBereich(aFull, scope);

  const vol = pipelineVolumen(a);
  const volWert =
    scope === "gesamt" ? vol.gesamt : scope === "immobilien" ? vol.immobilien : vol.vv;
  const gewonnen = a.deals.filter((d) => isWon(d, a.sMap)).length;

  const funnelScopes =
    scope === "gesamt"
      ? aFull.meineBereiche
      : ([scope] as ("immobilien" | "vv")[]);
  const gemischt = funnelScopes.length > 1;

  const dealTimeWert = gemischt
    ? ratenWert(aFull, funnelScopes, dealTimeTage, (v) => `${Math.round(v)} T`)
    : (() => {
        const v = dealTimeTage(a);
        return v != null ? `${Math.round(v)} Tage` : "—";
      })();
  const closingWert = gemischt
    ? ratenWert(aFull, funnelScopes, closingRate, (v) => formatProzent(v, 0))
    : (() => {
        const v = closingRate(a);
        return v != null ? formatProzent(v, 0) : "—";
      })();

  const perBerater = new Map<string, number>();
  for (const d of a.deals) {
    if (isOpen(d, a.sMap))
      perBerater.set(
        d.berater_id,
        (perBerater.get(d.berater_id) ?? 0) + betragOf(d),
      );
  }
  const beraterVolumen = [...perBerater.entries()]
    .map(([id, v]) => ({
      label: (a.beraterMap.get(id) ?? "—").split(" ")[0],
      value: v,
    }))
    .sort((x, y) => y.value - x.value);

  return (
    <>
      <Topbar
        title="Pipeline-Volumen"
        subtitle="Volumen, Phasen, Konversion, Deal-Time & Closing Rate"
      />
      <div className="space-y-6 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DashboardTabs />
          <BereichSwitcher aktiv={scope} erlaubt={erlaubteScopes(aFull)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={a.isGf ? "Pipeline-Volumen" : "Meine Pipeline (Volumen)"}
            value={formatEUR(volWert)}
            icon={TrendingUp}
            tone="accent"
          />
          <KpiCard
            label={gemischt ? "Ø Deal-Time (Immo / VV)" : "Ø Deal-Time"}
            value={dealTimeWert}
            icon={Timer}
            tone="info"
          />
          <KpiCard
            label={gemischt ? "Closing Rate (Immo / VV)" : "Closing Rate"}
            value={closingWert}
            icon={Percent}
            tone="success"
          />
          <KpiCard
            label="Gewonnene Deals"
            value={String(gewonnen)}
            icon={CheckCircle2}
            tone="success"
          />
        </div>

        {/* 5.3: Bei Einzel-Bereich füllt die Karte die volle Breite —
            keine leere rechte Hälfte (Muster wie Haupt-Dashboard). */}
        <div
          className={
            funnelScopes.length === 1
              ? "grid items-stretch gap-4"
              : "grid items-stretch gap-4 lg:grid-cols-2"
          }
        >
          {funnelScopes.map((b) => (
            <ChartCard
              key={b}
              title={`Funnel ${bereichLabel(b)}`}
              subtitle="Je Phase erreicht (kumulativ) · Abschluss zählt nur Gewonnene"
            >
              <PipelineFunnel steps={funnelFor(b, aFull)} />
            </ChartCard>
          ))}
        </div>

        <div
          className={
            funnelScopes.length === 1
              ? "grid items-stretch gap-4"
              : "grid items-stretch gap-4 lg:grid-cols-2"
          }
        >
          {funnelScopes.map((b) => (
            <KonversionCard
              key={b}
              title={`Konversion ${bereichLabel(b)}`}
              funnel={funnelFor(b, aFull)}
            />
          ))}
        </div>

        <ChartCard
          title="Pipeline-Volumen pro Berater"
          subtitle={
            scope === "gesamt"
              ? "Offene Deals · Immobilien-Kaufpreise + VV-BWS"
              : `Offene Deals · ${bereichLabel(scope)}`
          }
        >
          {beraterVolumen.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Keine offenen Deals.
            </p>
          ) : (
            <BarSeries data={beraterVolumen} />
          )}
        </ChartCard>
      </div>
    </>
  );
}
