import Link from "next/link";
import { CheckCircle2, Layers, TrendingUp, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { bereichLabel } from "@/config/enums";
import { formatDate, formatEUR, formatKompakt } from "@/lib/format";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { AreaTrend } from "@/components/charts/area-trend";
import { PipelineFunnel } from "@/components/charts/pipeline-funnel";
import { DonutBreakdown } from "@/components/charts/donut-breakdown";
import { DashboardTabs } from "./dashboard-tabs";
import { BereichSwitcher } from "./bereich-switcher";
import { HeuteBlock } from "./heute-block";
import { ProvisionBlock } from "./provision-block";
import { ZielBlock } from "./ziel-block";
import { loadZielDaten } from "@/lib/ziele";
import {
  loadAnalytics,
  scopeToBereich,
  resolveScope,
  erlaubteScopes,
  pipelineVolumen,
  funnelFor,
  umsatzProMonat,
  umsatzRollierend,
  umsatzNachQuelle,
  umsatzGesamt,
  betragOf,
  isWon,
  isOpen,
} from "@/lib/analytics";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ bereich?: string }>;
}) {
  const { bereich: rawBereich } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let vorname = "";
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("vorname")
      .eq("id", user.id)
      .single();
    vorname = data?.vorname ?? "";
  }

  const aFull = await loadAnalytics();
  // Ziel-Box nur für Berater (Ber. 2): Motivation direkt nach dem Login.
  const zielDaten = aFull.isGf ? null : await loadZielDaten();
  const scope = resolveScope(aFull, rawBereich);
  const a = scopeToBereich(aFull, scope);
  const now = new Date();
  const vol = pipelineVolumen(a);
  const offene = a.deals.filter((d) => isOpen(d, a.sMap)).length;
  const gewonnen = a.deals.filter((d) => isWon(d, a.sMap)).length;
  const umsatz = umsatzGesamt(a);
  const trend = umsatzProMonat(a, 12, now);
  // Rollierende 30 Tage vs. die 30 Tage davor (Wunsch 5): kein verzerrter
  // „Teilmonat vs. Vollmonat"-Vergleich mehr am Monatsanfang.
  const roll = umsatzRollierend(a, now, 30);
  const umsatz30 = roll.current;
  const mom =
    roll.previous > 0 && roll.current > 0
      ? ((roll.current - roll.previous) / roll.previous) * 100
      : null;
  const quelle = umsatzNachQuelle(a);

  // Funnel(s): bei "Gesamt" beide Sparten getrennt zeigen — Raten und
  // Phasen zweier Pipelines werden nie vermischt (Wunsch A).
  const funnelScopes =
    scope === "gesamt"
      ? aFull.meineBereiche
      : ([scope] as ("immobilien" | "vv")[]);

  const recent = [...a.deals]
    .filter((d) => isOpen(d, a.sMap))
    .sort((x, y) => y.created_at.localeCompare(x.created_at))
    .slice(0, 6);

  const h = now.getHours();
  const gruss = h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
  const pipelineGesamtVol =
    scope === "gesamt" ? vol.gesamt : scope === "immobilien" ? vol.immobilien : vol.vv;

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle="Überblick über deine Vertriebsaktivitäten"
      />
      <div className="space-y-6 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DashboardTabs />
          <BereichSwitcher aktiv={scope} erlaubt={erlaubteScopes(aFull)} />
        </div>

        <div>
          <h2 className="text-lg font-semibold">
            {gruss}
            {vorname ? `, ${vorname}` : ""} 👋
          </h2>
          <p className="text-sm text-muted-foreground">
            Hier ist dein Überblick für heute
            {scope !== "gesamt" ? ` · ${bereichLabel(scope)}` : ""}.
          </p>
        </div>

        {/* Ziel-Box (Schleife 3, Ber. 2): einloggen -> sofort motiviert */}
        {zielDaten && <ZielBlock daten={zielDaten} />}

        {/* Heute-Ansicht (4.1): die Handlungsliste zuerst */}
        <HeuteBlock />

        {/* KPIs — klickbar (4.6): führen zur dahinterliegenden Liste */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={a.isGf ? "Umsatz (30 Tage)" : "Meine Provision (30 Tage)"}
            value={formatEUR(umsatz30)}
            delta={mom}
            deltaLabel="vs. 30 Tage davor"
            href="/dashboard/performance"
            icon={Wallet}
            tone="accent"
          />
          <KpiCard
            label={a.isGf ? "Pipeline-Volumen" : "Meine Pipeline (Volumen)"}
            value={formatEUR(pipelineGesamtVol)}
            href={
              scope === "vv"
                ? "/vermoegensverwaltung"
                : scope === "immobilien"
                  ? "/immobilien"
                  : "/listen/deals?preset=offen"
            }
            icon={TrendingUp}
            tone="info"
          />
          <KpiCard
            label="Gewonnene Deals"
            value={String(gewonnen)}
            href="/listen/deals?preset=verkauft"
            icon={CheckCircle2}
            tone="success"
          />
          <KpiCard
            label="Offene Deals"
            value={String(offene)}
            href="/listen/deals?preset=offen"
            icon={Layers}
            tone="warning"
          />
        </div>

        {/* Erwartete Provision (4.2) — prominenter als das reine Volumen */}
        <ProvisionBlock a={aFull} scope={scope} />

        {/* Links (2/3): Umsatzentwicklung + Aktuelle Deals · Rechts (1/3):
            Funnel(s) + Quelle. Zusammengelegt, damit „Aktuelle Deals" den
            Leerraum neben einem einzelnen Funnel füllt (Wunsch 15). */}
        <div className="grid items-start gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <ChartCard
              title="Umsatzentwicklung"
              subtitle="Provision aus gewonnenen Deals, letzte 12 Monate"
            >
              <AreaTrend data={trend} />
            </ChartCard>
            <ChartCard
              title="Aktuelle Deals"
              subtitle="Zuletzt angelegte offene Deals"
            >
              {recent.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  Noch keine offenen Deals.
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {recent.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/deals/${d.id}`}
                        className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium">
                            {d.dealname}
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-muted-foreground">
                            <Pill tone="accent">{bereichLabel(d.bereich)}</Pill>
                            <span>{a.sMap.get(d.stage_id)?.name ?? "—"}</span>
                            <span aria-hidden>·</span>
                            <span>angelegt {formatDate(d.created_at)}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-sm font-semibold tabular-nums">
                          {formatEUR(betragOf(d))}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </ChartCard>
          </div>
          <div className="space-y-4">
            {funnelScopes.map((b) => (
              <ChartCard
                key={b}
                title={`Funnel ${bereichLabel(b)}`}
                subtitle="Je Phase erreicht (kumulativ)"
              >
                <PipelineFunnel steps={funnelFor(b, aFull)} />
              </ChartCard>
            ))}
            {/* Bei 0 Abschlüssen ausblenden statt leer (Schleife 2, 4.6). */}
            {quelle.length > 0 && (
              <ChartCard
                title="Umsatz nach Quelle"
                subtitle="Provision aus gewonnenen Deals je Leadquelle"
              >
                <DonutBreakdown
                  data={quelle}
                  centerValue={formatKompakt(umsatz)}
                />
              </ChartCard>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
