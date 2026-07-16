import { Topbar } from "@/components/layout/topbar";
import { formatEUR, formatProzent } from "@/lib/format";
import { ExpandableStat } from "@/components/charts/expandable-stat";
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

  // Aufschlüsselungen für die klickbaren KPIs (Feedback SJ: so interaktiv
  // wie möglich — jede Zahl zeigt auf Klick, woraus sie entsteht).
  const offeneD = a.deals.filter((d) => isOpen(d, a.sMap));
  const volumenDetails = [
    ...funnelScopes.map((b) => {
      const teil = offeneD.filter((d) => d.bereich === b);
      return {
        label: `${bereichLabel(b)} (${teil.length} offen)`,
        value: formatEUR(teil.reduce((s, d) => s + betragOf(d), 0)),
        tone: b === "immobilien" ? "primary" : "info",
      };
    }),
    { label: "Offene Deals gesamt", value: String(offeneD.length) },
  ];
  const dealTimeDetails = funnelScopes.map((b) => {
    const v = dealTimeTage(scopeToBereich(aFull, b));
    return {
      label: bereichLabel(b),
      value: v != null ? `${Math.round(v)} Tage` : "— (noch kein Abschluss)",
    };
  });
  const closingDetails = funnelScopes.map((b) => {
    const v = closingRate(scopeToBereich(aFull, b));
    return {
      label: bereichLabel(b),
      value: v != null ? formatProzent(v, 0) : "— (noch kein erster Termin)",
    };
  });
  const gewonneneDeals = a.deals
    .filter((d) => isWon(d, a.sMap))
    .sort((x, y) => betragOf(y) - betragOf(x));
  const gewonnenDetails = gewonneneDeals.map((d) => ({
    label: `${d.dealname} · ${bereichLabel(d.bereich)}`,
    value: formatEUR(betragOf(d)),
  }));

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
          <ExpandableStat
            label={a.isGf ? "Pipeline-Volumen" : "Meine Pipeline (Volumen)"}
            value={formatEUR(volWert)}
            iconKey="trend"
            tone="accent"
            details={volumenDetails}
            info="Summe aller offenen Deals: Immobilien zählen mit dem Kaufpreis, VV mit der Bewertungssumme (BWS). Gewonnene und verlorene Deals zählen nicht mehr mit."
            linkHref="/listen/deals?preset=offen&from=%2Fdashboard%2Fpipeline"
            linkLabel="Alle offenen Deals ansehen"
          />
          <ExpandableStat
            label={gemischt ? "Ø Deal-Time (Immo / VV)" : "Ø Deal-Time"}
            value={dealTimeWert}
            iconKey="timer"
            tone="info"
            details={dealTimeDetails}
            info="Ø Zeit vom ersten Termin (Immobilien: T1 Konzept, VV: Termin vereinbart) bis zum gewonnenen Abschluss — nur gewonnene Deals zählen, je Sparte getrennt."
          />
          <ExpandableStat
            label={gemischt ? "Closing Rate (Immo / VV)" : "Closing Rate"}
            value={closingWert}
            iconKey="percent"
            tone="success"
            details={closingDetails}
            info="Gewonnene Deals ÷ Deals, die mindestens den ersten Termin erreicht haben — je Sparte getrennt, damit sich die Quoten nicht vermischen."
          />
          <ExpandableStat
            label="Gewonnene Deals"
            value={String(gewonnen)}
            iconKey="check"
            tone="success"
            details={gewonnenDetails}
            info="Alle gewonnenen Abschlüsse im gewählten Bereich — aufklappen zeigt jeden Deal einzeln mit seinem Volumen."
            linkHref="/listen/deals?preset=verkauft&from=%2Fdashboard%2Fpipeline"
            linkLabel="Zur Verkaufs-Liste"
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
