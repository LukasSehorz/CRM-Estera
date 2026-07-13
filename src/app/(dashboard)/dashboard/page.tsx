import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MidnightHeader } from "@/components/layout/midnight-header";
import { bereichLabel } from "@/config/enums";
import { formatKompakt } from "@/lib/format";
import { ChartCard } from "@/components/charts/chart-card";
import { PipelineFunnel } from "@/components/charts/pipeline-funnel";
import { DonutBreakdown } from "@/components/charts/donut-breakdown";
import { DashboardTabs } from "./dashboard-tabs";
import { BereichSwitcher } from "./bereich-switcher";
import { HeuteBlock } from "./heute-block";
import { ZielBlock } from "./ziel-block";
import { MeinEinkommenBlock } from "./mein-einkommen-block";
import { PartnerBlock } from "./partner-block";
import { werteFuer, type Werte } from "./provision-block";
import { BalanceCard, ForecastCard, DealsCard } from "./midnight-cards";
import { OverviewCard, type UmsatzRange } from "./overview-card";
import { loadZielDaten } from "@/lib/ziele";
import {
  loadAnalytics,
  scopeToBereich,
  resolveScope,
  erlaubteScopes,
  funnelFor,
  umsatzProMonat,
  umsatzRollierend,
  umsatzNachQuelle,
  umsatzGesamt,
  betragOf,
  isWon,
  isOpen,
} from "@/lib/analytics";

const ROLLE_LABEL: Record<string, string> = {
  geschaeftsfuehrung: "Geschäftsführer",
  berater: "Berater",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ bereich?: string }>;
}) {
  const { bereich: rawBereich } = await searchParams;
  // Identität: Berater sehen ihr eigenes Profil, GF-Konten den
  // Kontoinhaber Ioannis Orfanidis samt Porträt (Wunsch).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let profilVorname = "";
  let profilName = "";
  let profilIstGf = false;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("vorname, nachname, rolle")
      .eq("id", user.id)
      .single();
    profilVorname = data?.vorname ?? "";
    profilName = data ? `${data.vorname} ${data.nachname}` : (user.email ?? "");
    profilIstGf = data?.rolle === "geschaeftsfuehrung";
    // Backoffice (2.5): kein Zugriff auf die provisionslastige Übersicht —
    // direkt in die Kontaktverwaltung leiten.
    if (data?.rolle === "backoffice") redirect("/kontakte");
  }
  const vorname = profilIstGf ? "Ioannis" : profilVorname;
  const name = profilIstGf ? "Ioannis Orfanidis" : profilName;
  const rolleLabel = profilIstGf
    ? ROLLE_LABEL.geschaeftsfuehrung
    : ROLLE_LABEL.berater;
  const fotoUrl = profilIstGf ? "/dashboard/profil-ioannis.png" : null;

  const aFull = await loadAnalytics();
  // Ziel-Box nur für Berater (Ber. 2): Motivation direkt nach dem Login.
  const zielDaten = aFull.isGf ? null : await loadZielDaten();
  const scope = resolveScope(aFull, rawBereich);
  const a = scopeToBereich(aFull, scope);
  const now = new Date();
  const offene = a.deals.filter((d) => isOpen(d, a.sMap)).length;
  const gewonnen = a.deals.filter((d) => isWon(d, a.sMap)).length;
  const umsatz = umsatzGesamt(a);
  const trend = umsatzProMonat(a, 12, now);

  // Umsatzentwicklung: vier wählbare Zeiträume. 30 Tage als Tagesreihe
  // (gewonnene Deals nach closed_at, wie umsatzProMonat), Monate als Slices.
  const tag = 24 * 60 * 60 * 1000;
  const daily = new Map<string, number>();
  const dailyLabels: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * tag);
    const key = d.toISOString().slice(0, 10);
    daily.set(key, 0);
    dailyLabels.push(key);
  }
  for (const d of a.deals) {
    if (!isWon(d, a.sMap) || !d.closed_at) continue;
    const key = d.closed_at.slice(0, 10);
    if (daily.has(key)) daily.set(key, (daily.get(key) ?? 0) + a.umsatzOf(d));
  }
  const daily30 = dailyLabels.map((key) => ({
    label: `${key.slice(8, 10)}.${key.slice(5, 7)}.`,
    value: daily.get(key) ?? 0,
  }));
  const mkMonatsRange = (
    key: string,
    label: string,
    points: { label: string; value: number }[],
  ): UmsatzRange => ({
    key,
    label,
    points,
    statLabel: "Ø Umsatz pro Monat",
    statValue: formatKompakt(
      points.length ? points.reduce((s, p) => s + p.value, 0) / points.length : 0,
    ),
  });
  const umsatzRanges: UmsatzRange[] = [
    {
      key: "30t",
      label: "30 Tage",
      points: daily30,
      statLabel: "Summe 30 Tage",
      statValue: formatKompakt(daily30.reduce((s, p) => s + p.value, 0)),
    },
    mkMonatsRange("3m", "3 Monate", trend.slice(-3)),
    mkMonatsRange("6m", "6 Monate", trend.slice(-6)),
    mkMonatsRange("12m", "12 Monate", trend),
  ];
  // Rollierende 30 Tage vs. die 30 Tage davor (Wunsch 5): kein verzerrter
  // „Teilmonat vs. Vollmonat"-Vergleich mehr am Monatsanfang.
  const roll = umsatzRollierend(a, now, 30);
  const umsatz30 = roll.current;
  const mom =
    roll.previous > 0 && roll.current > 0
      ? ((roll.current - roll.previous) / roll.previous) * 100
      : null;
  const quelle = umsatzNachQuelle(a);

  // Blick nach vorn: Werte über die sichtbaren Bereiche summieren (wie
  // im bisherigen ProvisionBlock, jetzt kompakt in einer Karte).
  const forecastBereiche =
    scope === "gesamt"
      ? aFull.meineBereiche
      : ([scope] as ("immobilien" | "vv")[]);
  const forecast = forecastBereiche
    .map((b) => werteFuer(aFull, b))
    .reduce<Werte>(
      (acc, w) => ({
        volumen: acc.volumen + w.volumen,
        erwartet: acc.erwartet + w.erwartet,
        gewichtet: acc.gewichtet + w.gewichtet,
        einbehalt: acc.einbehalt + w.einbehalt,
        naechsteFaelligkeit:
          acc.naechsteFaelligkeit == null ||
          (w.naechsteFaelligkeit != null &&
            w.naechsteFaelligkeit < acc.naechsteFaelligkeit)
            ? w.naechsteFaelligkeit
            : acc.naechsteFaelligkeit,
      }),
      {
        volumen: 0,
        erwartet: 0,
        gewichtet: 0,
        einbehalt: 0,
        naechsteFaelligkeit: null,
      },
    );

  // Funnel(s): bei "Gesamt" beide Sparten getrennt zeigen — Raten und
  // Phasen zweier Pipelines werden nie vermischt (Wunsch A).
  const funnelScopes =
    scope === "gesamt"
      ? aFull.meineBereiche
      : ([scope] as ("immobilien" | "vv")[]);

  const recent = [...a.deals]
    .filter((d) => isOpen(d, a.sMap))
    .sort((x, y) => y.created_at.localeCompare(x.created_at))
    .slice(0, 6)
    .map((d) => ({
      id: d.id,
      dealname: d.dealname,
      bereich: d.bereich,
      created_at: d.created_at,
      stageName: a.sMap.get(d.stage_id)?.name ?? "—",
      betrag: betragOf(d),
    }));

  return (
    <>
      <MidnightHeader vorname={vorname} name={name} rolle={rolleLabel} fotoUrl={fotoUrl} />
      <div className="space-y-4 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DashboardTabs />
          <BereichSwitcher aktiv={scope} erlaubt={erlaubteScopes(aFull)} />
        </div>

        {/* Ziel-Box (Schleife 3, Ber. 2): einloggen -> sofort motiviert */}
        {zielDaten && <ZielBlock daten={zielDaten} />}

        {/* Hero-Reihe: Graph · Total Balance · Blick nach vorn */}
        <div className="grid items-stretch gap-4 xl:grid-cols-12">
          <OverviewCard ranges={umsatzRanges} mom={mom} className="xl:col-span-4" />
          <BalanceCard
            umsatz30={umsatz30}
            mom={mom}
            gewonnen={gewonnen}
            umsatzGesamt={umsatz}
            isGf={a.isGf}
            className="xl:col-span-5"
          />
          <ForecastCard
            werte={forecast}
            offeneDeals={offene}
            isGf={a.isGf}
            className="xl:col-span-3"
          />

          {/* Reihe 2: Heute-Handlungsliste · Aktuelle Deals */}
          <div className="xl:col-span-4">
            <HeuteBlock />
          </div>
          <DealsCard deals={recent} className="xl:col-span-8" />

          {/* Reihe 3: Funnels je Sparte */}
          {funnelScopes.map((b) => (
            <ChartCard
              key={b}
              title={`Funnel ${bereichLabel(b)}`}
              subtitle="Je Phase erreicht (kumulativ)"
              className={
                funnelScopes.length === 1 ? "xl:col-span-12" : "xl:col-span-6"
              }
            >
              <PipelineFunnel steps={funnelFor(b, aFull)} />
            </ChartCard>
          ))}

          {/* Reihe 4: Umsatz nach Quelle (volle Breite) */}
          {quelle.length > 0 && (
            <ChartCard
              title="Umsatz nach Quelle"
              subtitle="Provision aus gewonnenen Deals je Leadquelle"
              className="xl:col-span-12"
            >
              <div className="mx-auto w-full max-w-2xl">
                <DonutBreakdown
                  data={quelle}
                  centerValue={formatKompakt(umsatz)}
                />
              </div>
            </ChartCard>
          )}
        </div>

        {/* Mein Einkommen (7.3/7.4) — nur Berater; Karriere nur bei VV-Sparte */}
        {user && !aFull.isGf && (
          <MeinEinkommenBlock
            a={aFull}
            beraterId={user.id}
            zeigeKarriere={aFull.meineBereiche.includes("vv")}
          />
        )}

        {/* Meine Partner & Tippgeber (8.1/8.3) — nur Berater, nur bei Downline */}
        {user && !aFull.isGf && <PartnerBlock a={aFull} beraterId={user.id} />}
      </div>
    </>
  );
}
