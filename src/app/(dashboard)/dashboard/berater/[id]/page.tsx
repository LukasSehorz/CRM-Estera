import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { Pill } from "@/components/ui/pill";
import { ExpandableStat } from "@/components/charts/expandable-stat";
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
  closingRateDetail,
  dealTimeTage,
  stornoQuote,
  betragOf,
  isOpen,
  isWon,
  isLost,
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

  // Aufschlüsselungen (Feedback SJ): Welche Deals stecken hinter den Zahlen?
  const realisierte = a.deals
    .filter((d) => a.istRealisiert(d))
    .sort((x, y) => a.umsatzOf(y) - a.umsatzOf(x));
  const umsatzDetails = realisierte.map((d) => ({
    label: `${d.dealname} · ${bereichLabel(d.bereich)}`,
    value: formatEUR(a.umsatzOf(d)),
  }));
  const volumenDetails = funnelScopes.map((b) => {
    const teil = a.deals
      .filter((d) => d.bereich === b && isOpen(d, a.sMap))
      .sort((x, y) => betragOf(y) - betragOf(x));
    return {
      label: `${bereichLabel(b)} (${teil.length} offen)`,
      value: formatEUR(teil.reduce((s, d) => s + betragOf(d), 0)),
      tone: b === "immobilien" ? "primary" : "info",
      deals: teil.map((d) => ({ name: d.dealname, value: formatEUR(betragOf(d)) })),
    };
  });
  // Deal-Ebene für Closing / Deal-Time / Storno (Feedback SJ: jede KPI tief).
  const toDealVol = (d: (typeof a.deals)[number]) => ({
    name: `${d.dealname} · ${bereichLabel(d.bereich)}`,
    value: formatEUR(betragOf(d)),
  });
  const wonD = a.deals.filter((d) => isWon(d, a.sMap));
  const lostD = a.deals.filter((d) => isLost(d, a.sMap));
  const dealTimeDeals = realisierte
    .map((d) => {
      const am = a.realisiertAm(d);
      const t = am
        ? Math.max(
            0,
            Math.round(
              (new Date(am).getTime() - new Date(d.created_at).getTime()) /
                86_400_000,
            ),
          )
        : 0;
      return { name: d.dealname, value: `${t} Tage`, _t: t };
    })
    .sort((x, y) => y._t - x._t)
    .map((r) => ({ name: r.name, value: r.value }));
  const closingDet = closingRateDetail(a);
  const closingDetails = [
    { label: "Gewonnen", value: String(closingDet.won), tone: "success", deals: wonD.map(toDealVol) },
    { label: "Verloren", value: String(lostD.length), tone: "muted", deals: lostD.map(toDealVol) },
    {
      // Basis der Quote: alle je den Ersttermin erreichten Deals (inkl. offen)
      // — damit Gewonnen ÷ Basis = Closing Rate nachrechenbar ist (Feedback SJ).
      label: "Basis (je Ersttermin erreicht)",
      value: `${closingDet.won} / ${closingDet.base}`,
      tone: "info",
    },
  ];
  const dealTimeDetails = [
    { label: "Realisierte Deals", value: String(dealTimeDeals.length), tone: "info", deals: dealTimeDeals },
  ];
  const stornoDetails = [
    { label: "Storniert", value: String(lostD.length), tone: "muted", deals: lostD.map(toDealVol) },
    { label: "Gewonnen (kein Storno)", value: String(wonD.length), tone: "success" },
  ];

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

  // Drill-down für die Seiten-Stats (Feedback SJ: auch hier bis zum Deal/Kunden).
  const gewonnSorted = [...gewonneneDeals].sort(
    (x, y) => betragOf(y) - betragOf(x),
  );
  const abschluesseDetails = [
    {
      label: "Gewonnene Deals",
      value: String(abschluesse),
      tone: "success",
      deals: gewonnSorted.map(toDealVol),
    },
  ];
  const kundenDetails = [
    {
      label: "Kunden",
      value: String(aBerater.contacts.length),
      tone: "primary",
      deals: aBerater.contacts.map((c) => ({
        name: `${c.vorname} ${c.nachname}`,
        value: "",
      })),
    },
  ];

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
          <ExpandableStat
            label="Umsatz (Estera-Provision)"
            value={formatEUR(umsatz)}
            iconKey="wallet"
            tone="accent"
            details={umsatzDetails}
            info="Realisierte Estera-Provision dieses Beraters — Immobilien zählen ab Notartermin, VV ab Policierung. Aufklappen zeigt jeden Deal mit seinem Beitrag."
          />
          <ExpandableStat
            label="Pipeline-Volumen (offen)"
            value={formatEUR(volWert)}
            iconKey="layers"
            tone="info"
            details={[
              ...volumenDetails,
              { label: "Offene Deals gesamt", value: String(offene) },
            ]}
            info="Summe der offenen Deals dieses Beraters: Immobilien mit Kaufpreis, VV mit BWS. Die einzelnen Deals stehen unten in der Karte „Offene Deals“."
          />
          <ExpandableStat
            label="Closing Rate"
            value={closing != null ? formatProzent(closing, 0) : "—"}
            iconKey="percent"
            tone="success"
            details={closingDetails}
            info="Gewonnene Deals ÷ Deals, die mindestens den ersten Termin erreicht haben (Immobilien: T1 Konzept, VV: Termin vereinbart), inkl. der noch offenen. Aufklappen zeigt Gewonnen, Verloren und die Basis, mit der sich die Prozentzahl nachrechnen lässt."
          />
          <ExpandableStat
            label="Ø Deal-Time"
            value={dealTime != null ? `${Math.round(dealTime)} Tage` : "—"}
            iconKey="timer"
            tone="warning"
            details={dealTimeDetails}
            info="Ø Zeit vom ersten Termin bis zum gewonnenen Abschluss — nur gewonnene Deals zählen. Aufklappen zeigt die Deal-Time jedes realisierten Deals."
          />
          <ExpandableStat
            label="Stornoquote"
            value={storno != null ? formatProzent(storno, 0) : "—"}
            iconKey="undo"
            tone="danger"
            details={stornoDetails}
            info="Verlorene Deals ÷ entschiedene Deals (gewonnen + verloren). Aufklappen zeigt, welche Deals storniert wurden."
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
            <ExpandableStat
              label="Gewonnene Abschlüsse"
              value={String(abschluesse)}
              iconKey="check"
              tone="success"
              details={abschluesseDetails}
              info="Alle gewonnenen Deals dieses Beraters — aufklappen zeigt jeden Abschluss mit Volumen."
            />
            <ExpandableStat
              label="Ø Deal-Größe (Volumen)"
              value={avgGroesse ? formatEUR(avgGroesse) : "—"}
              iconKey="ruler"
              tone="info"
              details={abschluesseDetails}
              info="Ø Transaktionsvolumen der gewonnenen Deals — aufklappen zeigt die einzelnen Abschlüsse."
            />
            <ExpandableStat
              label="Kunden"
              value={String(aBerater.contacts.length)}
              iconKey="layers"
              tone="accent"
              details={kundenDetails}
              info="Alle diesem Berater zugeordneten Kunden — aufklappen zeigt die Namen."
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

