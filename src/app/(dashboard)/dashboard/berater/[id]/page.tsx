import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Layers,
  Percent,
  Ruler,
  Timer,
  Trophy,
  Undo2,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { AreaTrend } from "@/components/charts/area-trend";
import { PipelineFunnel } from "@/components/charts/pipeline-funnel";
import { bereichLabel } from "@/config/enums";
import { formatEUR, formatProzent } from "@/lib/format";
import { BereichSwitcher } from "../../bereich-switcher";
import { MeinEinkommenBlock } from "../../mein-einkommen-block";
import { PartnerBlock } from "../../partner-block";
import {
  loadAnalytics,
  scopeToBerater,
  scopeToBereich,
  resolveScope,
  erlaubteScopes,
  funnelFor,
  conversionRates,
  umsatzGesamt,
  umsatzProMonat,
  pipelineVolumen,
  closingRate,
  dealTimeTage,
  stornoQuote,
  betragOf,
  isOpen,
  isWon,
} from "@/lib/analytics";

/**
 * Berater-Drilldown (Wunsch B): Klick auf einen Berater öffnet alle Infos zu
 * ihm — Kennzahlen, Funnel, offene Deals, Einbehalte. NUR Geschäftsführung.
 */
export default async function BeraterDrilldownPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ bereich?: string }>;
}) {
  const { id } = await params;
  const { bereich: rawBereich } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("rolle")
    .eq("id", user.id)
    .single();
  if (me?.rolle !== "geschaeftsfuehrung") redirect("/dashboard");

  const { data: berater } = await supabase
    .from("profiles")
    .select("id, vorname, nachname, rolle, aktiv, vertriebler_stufe, bereich")
    .eq("id", id)
    .maybeSingle();
  if (!berater) notFound();

  const aAll = await loadAnalytics();
  const aBerater = scopeToBerater(aAll, id);
  const scope = resolveScope(aBerater, rawBereich);
  const a = scopeToBereich(aBerater, scope);
  const now = new Date();

  const vol = pipelineVolumen(a);
  const volWert =
    scope === "gesamt" ? vol.gesamt : scope === "immobilien" ? vol.immobilien : vol.vv;
  const offene = a.deals.filter((d) => isOpen(d, a.sMap)).length;
  const umsatz = umsatzGesamt(a);
  const closing = closingRate(a);
  const dealTime = dealTimeTage(a);
  const storno = stornoQuote(a);
  const trend = umsatzProMonat(a, 12, now);

  const funnelScopes =
    scope === "gesamt"
      ? (["immobilien", "vv"] as const)
      : ([scope] as ("immobilien" | "vv")[]);

  // Offene Deals mit Tagen in der Phase (Frist-Überschreitung markiert)
  const offeneDeals = a.deals.filter((d) => isOpen(d, a.sMap));
  const { data: verlauf } = offeneDeals.length
    ? await supabase
        .from("deal_stage_history")
        .select("deal_id, entered_at")
        .in(
          "deal_id",
          offeneDeals.map((d) => d.id),
        )
        .is("left_at", null)
    : { data: [] as { deal_id: string; entered_at: string }[] };
  const enteredMap = new Map(
    (verlauf ?? []).map((h) => [h.deal_id, h.entered_at]),
  );
  const { data: slaStages } = await supabase
    .from("pipeline_stages")
    .select("id, sla_tage");
  const slaMap = new Map((slaStages ?? []).map((s) => [s.id, s.sla_tage]));

  const dealZeilen = offeneDeals
    .map((d) => {
      const entered = enteredMap.get(d.id);
      const tage = entered
        ? Math.max(
            0,
            Math.floor((now.getTime() - new Date(entered).getTime()) / 86_400_000),
          )
        : null;
      const sla = slaMap.get(d.stage_id);
      return {
        d,
        tage,
        ueberFrist: sla != null && tage != null && tage > Number(sla),
      };
    })
    .sort((x, y) => (y.tage ?? 0) - (x.tage ?? 0));

  // Seiten-KPIs (Feedback SJ 2.9): „Offene Einbehalte" raus (steht bereits in
  // „Mein Einkommen"), stattdessen zwei aussagekräftige Kennzahlen.
  const gewonneneDeals = aBerater.deals.filter((x) => isWon(x, aBerater.sMap));
  const abschluesse = gewonneneDeals.length;
  const avgGroesse = abschluesse
    ? gewonneneDeals.reduce((s, d) => s + betragOf(d), 0) / abschluesse
    : 0;

  const sparten = (berater.bereich?.length ? berater.bereich : ["immobilien", "vv"])
    .map((b) => bereichLabel(b))
    .join(" · ");

  return (
    <>
      <Topbar
        title={`${berater.vorname} ${berater.nachname}`}
        subtitle="Berater-Drilldown — alle Kennzahlen zu diesem Berater"
      >
        <Pill tone={berater.rolle === "geschaeftsfuehrung" ? "accent" : "muted"}>
          {berater.rolle === "geschaeftsfuehrung" ? "Geschäftsführung" : "Berater"}
        </Pill>
        <Pill tone="info">Stufe {Number(berater.vertriebler_stufe ?? 0)} %</Pill>
        <Pill tone="muted">{sparten}</Pill>
      </Topbar>
      <div className="space-y-6 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard/performance"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Berater-Performance
          </Link>
          <BereichSwitcher aktiv={scope} erlaubt={erlaubteScopes(aBerater)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Umsatz (Estera-Provision)"
            value={formatEUR(umsatz)}
            icon={Wallet}
            tone="accent"
          />
          <KpiCard
            label="Pipeline-Volumen (offen)"
            value={formatEUR(volWert)}
            sub={`${offene} offene Deals`}
            icon={Layers}
            tone="info"
          />
          <KpiCard
            label="Closing Rate"
            value={closing != null ? formatProzent(closing, 0) : "—"}
            icon={Percent}
            tone="success"
          />
          <KpiCard
            label="Ø Deal-Time"
            value={dealTime != null ? `${Math.round(dealTime)} Tage` : "—"}
            icon={Timer}
            tone="warning"
          />
          <KpiCard
            label="Stornoquote"
            value={storno != null ? formatProzent(storno, 0) : "—"}
            icon={Undo2}
            tone="danger"
          />
        </div>

        <div className="grid items-stretch gap-4 lg:grid-cols-3">
          <ChartCard
            title="Umsatzentwicklung"
            subtitle="Estera-Provision aus gewonnenen Deals, 12 Monate"
            className="lg:col-span-2"
          >
            <AreaTrend data={trend} />
          </ChartCard>
          <div className="grid gap-4">
            <SideStat
              label="Gewonnene Abschlüsse"
              value={String(abschluesse)}
              icon={Trophy}
              tone="success"
            />
            <SideStat
              label="Ø Deal-Größe (Volumen)"
              value={avgGroesse ? formatEUR(avgGroesse) : "—"}
              icon={Ruler}
              tone="info"
            />
            <SideStat
              label="Kunden"
              value={String(aBerater.contacts.length)}
              icon={Users}
              tone="primary"
            />
          </div>
        </div>

        {/* Mein Einkommen (7.3/7.4) aus GF-Sicht — Karriere nur bei VV-Sparte */}
        <MeinEinkommenBlock
          a={aAll}
          beraterId={id}
          zeigeKarriere={(berater.bereich ?? []).includes("vv")}
        />

        {/* Partner & Tippgeber dieses Beraters (8.1/8.3) */}
        <PartnerBlock a={aAll} beraterId={id} />

        <div className="grid items-start gap-4 lg:grid-cols-2">
          {funnelScopes.map((b) => {
            const f = funnelFor(b, aBerater);
            const conv = conversionRates(f);
            return (
              <ChartCard
                key={b}
                title={`Funnel ${bereichLabel(b)}`}
                subtitle="Je Phase erreicht (kumulativ) · nur dieser Berater"
              >
                <PipelineFunnel steps={f} />
                {conv.length > 0 && (
                  <ul className="mt-4 space-y-1.5 border-t border-border pt-3 text-sm">
                    {conv.map((c) => (
                      <li
                        key={`${c.from}-${c.to}`}
                        className="flex items-center justify-between gap-3"
                      >
                        <span className="min-w-0 truncate text-muted-foreground">
                          {c.from} → {c.to}
                        </span>
                        <span className="shrink-0 font-medium tabular-nums">
                          {formatProzent(c.rate, 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </ChartCard>
            );
          })}
        </div>

        <ChartCard
          title="Offene Deals"
          subtitle="Nach Verweildauer in der aktuellen Phase · Frist-Überschreitung markiert"
        >
          {dealZeilen.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Keine offenen Deals.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {dealZeilen.map(({ d, tage, ueberFrist }) => (
                <li key={d.id}>
                  <Link
                    href={`/deals/${d.id}`}
                    className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">
                        {d.dealname}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Pill tone="accent">
                          {a.sMap.get(d.stage_id)?.name ?? "—"}
                        </Pill>
                        <span>{bereichLabel(d.bereich)}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {tage != null && (
                        <span
                          className={
                            ueberFrist
                              ? "rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-semibold text-danger"
                              : "rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
                          }
                        >
                          {tage} T in Phase
                        </span>
                      )}
                      <span className="text-sm font-semibold tabular-nums">
                        {formatEUR(betragOf(d))}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </>
  );
}

const SIDE_TONE = {
  success: "bg-success/10 text-success",
  info: "bg-info/10 text-info",
  primary: "bg-primary/10 text-primary",
} as const;

/** Kompakte Kennzahl-Karte für die Seitenspalte neben der Umsatzentwicklung. */
function SideStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: keyof typeof SIDE_TONE;
}) {
  return (
    <div className="flex flex-col justify-center rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-lg ${SIDE_TONE[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight tabular-nums">
        {value}
      </div>
    </div>
  );
}
