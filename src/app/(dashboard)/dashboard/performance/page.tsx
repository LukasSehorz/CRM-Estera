import {
  CalendarClock,
  Percent,
  Ruler,
  Timer,
  Undo2,
  Wallet,
} from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { formatEUR, formatProzent } from "@/lib/format";
import { KpiCard } from "@/components/charts/kpi-card";
import { DashboardTabs } from "../dashboard-tabs";
import { BereichSwitcher } from "../bereich-switcher";
import { PerformanceView, type PerfRow } from "./performance-view";
import { GfSignale } from "./gf-signale";
import { SummenSkalaBlock } from "./summen-skala";
import {
  loadAnalytics,
  scopeToBereich,
  resolveScope,
  erlaubteScopes,
  beraterPerformance,
  umsatzGesamt,
  volumenGewonnen,
  dealTimeTage,
  closingRate,
  stornoQuote,
  forecastGewichtet,
  umsatzRollierend,
  isWon,
} from "@/lib/analytics";

export default async function PerformanceDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ bereich?: string }>;
}) {
  const { bereich: rawBereich } = await searchParams;
  const aFull = await loadAnalytics();
  const scope = resolveScope(aFull, rawBereich);
  const a = scopeToBereich(aFull, scope);
  const now = new Date();
  const perf = beraterPerformance(a);

  // Umsatz je Periode je Berater — nach Buchungsdatum (1.1: Immobilien
  // realisieren zum Notartermin, VV bei Policierung).
  const mk = () => ({ monat: 0, quartal: 0, jahr: 0, gesamt: 0 });
  const byPeriod = new Map<string, ReturnType<typeof mk>>();
  for (const p of perf) byPeriod.set(p.id, mk());
  for (const d of a.deals) {
    const am = a.realisiertAm(d);
    if (!am) continue;
    let b = byPeriod.get(d.berater_id);
    if (!b) {
      b = mk();
      byPeriod.set(d.berater_id, b);
    }
    const c = new Date(am);
    const amt = a.umsatzOf(d);
    b.gesamt += amt;
    if (c.getFullYear() === now.getFullYear()) {
      b.jahr += amt;
      if (Math.floor(c.getMonth() / 3) === Math.floor(now.getMonth() / 3))
        b.quartal += amt;
      if (c.getMonth() === now.getMonth()) b.monat += amt;
    }
  }

  const rows: PerfRow[] = perf.map((p) => ({
    id: p.id,
    name: p.name,
    offene: p.offene,
    avgDealGroesse: p.avgDealGroesse,
    dealTime: p.dealTime,
    closing: p.closing,
    storno: p.storno,
    umsatz: byPeriod.get(p.id) ?? mk(),
  }));

  const umsatz = umsatzGesamt(a);
  const gewonnen = a.deals.filter((d) => isWon(d, a.sMap)).length;
  // Ø Deal-Größe = Transaktionsvolumen (1.1), nicht die Provision.
  const avgGroesse = gewonnen ? volumenGewonnen(a) / gewonnen : 0;
  const storno = stornoQuote(a);
  const forecast = forecastGewichtet(a);
  // Rollierender 30-Tage-Umsatz — dieselbe Zahl wie auf dem Übersicht-Dashboard,
  // damit man sie nach dem KPI-Klick auch hier auf einen Blick sieht (Wunsch 3).
  const roll = umsatzRollierend(a, now, 30);
  const rollMom =
    roll.previous > 0 && roll.current > 0
      ? ((roll.current - roll.previous) / roll.previous) * 100
      : null;
  // Wochenrückblick (5.6): letzte 7 Tage vs. die 7 Tage davor — Grundlage des
  // wöchentlichen Team-Plans („wie ist die letzte Woche gelaufen?").
  const woche = umsatzRollierend(a, now, 7);
  const wocheDelta =
    woche.previous > 0 && woche.current > 0
      ? ((woche.current - woche.previous) / woche.previous) * 100
      : null;

  return (
    <>
      <Topbar
        title="Berater-Performance"
        subtitle="Umsatz, Deal-Größe, Deal-Time, Closing & Storno je Berater"
      />
      <div className="space-y-6 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DashboardTabs />
          <BereichSwitcher aktiv={scope} erlaubt={erlaubteScopes(aFull)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {/* Wochenrückblick (5.6): das wichtigste Steuerungsintervall */}
          <KpiCard
            label={a.isGf ? "Umsatz (7 Tage)" : "Mein Umsatz (7 Tage)"}
            value={formatEUR(woche.current)}
            delta={wocheDelta}
            deltaLabel="vs. Vorwoche"
            icon={CalendarClock}
            tone="success"
          />
          <KpiCard
            label={a.isGf ? "Umsatz (30 Tage)" : "Mein Umsatz (30 Tage)"}
            value={formatEUR(roll.current)}
            delta={rollMom}
            deltaLabel="vs. 30 Tage davor"
            icon={CalendarClock}
            tone="accent"
          />
          <KpiCard
            label={a.isGf ? "Umsatz gesamt (Provision)" : "Mein Umsatz gesamt"}
            value={formatEUR(umsatz)}
            icon={Wallet}
            tone="accent"
          />
          <KpiCard
            label="Ø Deal-Größe (Volumen)"
            value={avgGroesse ? formatEUR(avgGroesse) : "—"}
            icon={Ruler}
            tone="info"
          />
          <KpiCard
            label="Ø Deal-Time"
            value={
              dealTimeTage(a) != null
                ? `${Math.round(dealTimeTage(a) as number)} Tage`
                : "—"
            }
            icon={Timer}
            tone="warning"
          />
          <KpiCard
            label="Closing Rate"
            value={
              closingRate(a) != null
                ? formatProzent(closingRate(a) as number, 0)
                : "—"
            }
            icon={Percent}
            tone="success"
          />
          <KpiCard
            label="Stornoquote"
            value={storno != null ? formatProzent(storno, 0) : "—"}
            icon={Undo2}
            tone="danger"
          />
        </div>

        {/* Berater-Liste direkt nach den KPIs (5.4): „Berater-Performance"
            zeigt die Berater ohne Scroll-Weg. */}
        <PerformanceView rows={rows} isGf={aFull.isGf} />

        {/* Forecast (Kap. 6): gewichtete Provision, nicht Volumen —
            inkl. Wochenforecast (5.6). */}
        <section>
          <div className="mb-3">
            <h2 className="text-base font-semibold">Forecast</h2>
            <p className="text-xs text-muted-foreground">
              Gewichtete {a.isGf ? "Estera-Provision" : "eigene Provision"} der
              offenen Pipeline — Näherung über die Phasen-Wahrscheinlichkeit.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Nächste 7 Tage"
              value={formatEUR(forecast.t7)}
              icon={CalendarClock}
              tone="success"
            />
            <KpiCard
              label="Nächste 30 Tage"
              value={formatEUR(forecast.t30)}
              icon={CalendarClock}
              tone="success"
            />
            <KpiCard
              label="Nächste 60 Tage"
              value={formatEUR(forecast.t60)}
              icon={CalendarClock}
              tone="info"
            />
            <KpiCard
              label="Nächste 90 Tage"
              value={formatEUR(forecast.t90)}
              icon={CalendarClock}
              tone="accent"
            />
          </div>
        </section>

        {/* Steuerungssignale — nur GF */}
        {aFull.isGf && <GfSignale a={aFull} />}

        {/* Summen-Skala (6.2) — nur GF, je Bereich + gesamt */}
        <SummenSkalaBlock a={aFull} />
      </div>
    </>
  );
}
