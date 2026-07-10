import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Hourglass,
  Layers,
  Percent,
  Timer,
  Undo2,
  Users,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { Pill } from "@/components/ui/pill";
import { KpiCard } from "@/components/charts/kpi-card";
import { ChartCard } from "@/components/charts/chart-card";
import { AreaTrend } from "@/components/charts/area-trend";
import { PipelineFunnel } from "@/components/charts/pipeline-funnel";
import { bereichLabel } from "@/config/enums";
import { formatDate, formatEUR, formatProzent } from "@/lib/format";
import { einbehaltFaelligAm } from "@/lib/provision";
import { BereichSwitcher } from "../../bereich-switcher";
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

  // Offene Einbehalte des Beraters (GF-Sicht: gesamter Einbehalt)
  const jetzt = now.toISOString();
  let einbehalt = 0;
  let naechsteFaelligkeit: string | null = null;
  for (const d of aBerater.deals.filter(
    (x) => x.bereich === "vv" && isWon(x, aBerater.sMap) && !x.factoring,
  )) {
    const f = einbehaltFaelligAm(d.closed_at ?? d.created_at);
    if (!f || f <= jetzt) continue;
    einbehalt += aBerater.einbehaltOf(d);
    if (!naechsteFaelligkeit || f < naechsteFaelligkeit) naechsteFaelligkeit = f;
  }

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

        <div className="grid items-start gap-4 lg:grid-cols-3">
          <ChartCard
            title="Umsatzentwicklung"
            subtitle="Estera-Provision aus gewonnenen Deals, 12 Monate"
            className="lg:col-span-2"
          >
            <AreaTrend data={trend} />
          </ChartCard>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Offene Einbehalte (VV)
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-warning/10 text-warning">
                  <Hourglass className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight tabular-nums">
                {einbehalt > 0 ? formatEUR(einbehalt) : "—"}
              </div>
              {naechsteFaelligkeit && (
                <p className="mt-2 text-xs text-muted-foreground">
                  nächste Auszahlung {formatDate(naechsteFaelligkeit)}
                </p>
              )}
            </div>
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Kontakte</span>
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </span>
              </div>
              <div className="mt-3 text-3xl font-bold tracking-tight tabular-nums">
                {aBerater.contacts.length}
              </div>
            </div>
          </div>
        </div>

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
