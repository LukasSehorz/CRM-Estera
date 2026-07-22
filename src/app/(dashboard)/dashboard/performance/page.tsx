import { Topbar } from "@/components/layout/topbar";
import { formatEUR, formatProzent } from "@/lib/format";
import { ExpandableStat } from "@/components/charts/expandable-stat";
import { DashboardTabs } from "../dashboard-tabs";
import { BereichSwitcher } from "../bereich-switcher";
import {
  PerformanceView,
  type PerfRow,
  type PerfDealDetail,
} from "./performance-view";
import { GfSignale } from "./gf-signale";
import { SummenSkalaBlock } from "./summen-skala";
import {
  loadAnalytics,
  scopeToBereich,
  resolveScope,
  erlaubteScopes,
  beraterPerformance,
  reserviertVerbrieft,
  umsatzGesamt,
  volumenGewonnen,
  dealTimeTage,
  closingRate,
  closingRateDetail,
  stornoQuote,
  forecastGewichtet,
  umsatzRollierend,
  isOpen,
  isWon,
  isLost,
  betragOf,
} from "@/lib/analytics";
import { dealBeraterProvision } from "@/lib/provision";
import { InfoHint } from "@/components/ui/info-hint";

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
  // realisieren zum Notartermin, VV bei Policierung). Zusätzlich nach Sparte
  // und die Berater-Provision, damit sich die Zahl aufklappen lässt (2.6).
  const mk = () => ({ monat: 0, quartal: 0, jahr: 0, gesamt: 0 });
  const byPeriod = new Map<string, ReturnType<typeof mk>>();
  const byImmo = new Map<string, ReturnType<typeof mk>>();
  const byVv = new Map<string, ReturnType<typeof mk>>();
  const byProv = new Map<string, ReturnType<typeof mk>>();
  for (const p of perf) {
    byPeriod.set(p.id, mk());
    byImmo.set(p.id, mk());
    byVv.set(p.id, mk());
    byProv.set(p.id, mk());
  }
  const addTo = (
    m: Map<string, ReturnType<typeof mk>>,
    id: string,
    c: Date,
    val: number,
  ) => {
    let x = m.get(id);
    if (!x) {
      x = mk();
      m.set(id, x);
    }
    x.gesamt += val;
    if (c.getFullYear() === now.getFullYear()) {
      x.jahr += val;
      if (Math.floor(c.getMonth() / 3) === Math.floor(now.getMonth() / 3))
        x.quartal += val;
      if (c.getMonth() === now.getMonth()) x.monat += val;
    }
  };
  const byDeals = new Map<string, PerfDealDetail[]>();
  for (const d of a.deals) {
    const am = a.realisiertAm(d);
    if (!am) continue;
    const id = d.berater_id;
    const c = new Date(am);
    const amt = a.umsatzOf(d);
    addTo(byPeriod, id, c, amt);
    addTo(d.bereich === "immobilien" ? byImmo : byVv, id, c, amt);
    addTo(byProv, id, c, dealBeraterProvision(d, a.stufeOf(id), a.immoModus));
    // Einzelne Deals hinter der Zahl (Feedback SJ: „welche zwei Deals hat
    // Julia gemacht?") — mit Perioden-Flags für den Umschalter.
    const imJahr = c.getFullYear() === now.getFullYear();
    const imQuartal =
      imJahr && Math.floor(c.getMonth() / 3) === Math.floor(now.getMonth() / 3);
    const imMonat = imJahr && c.getMonth() === now.getMonth();
    const liste = byDeals.get(id) ?? [];
    liste.push({
      dealId: d.id,
      dealname: d.dealname,
      bereich: d.bereich,
      betrag: amt,
      periode: { monat: imMonat, quartal: imQuartal, jahr: imJahr },
    });
    byDeals.set(id, liste);
  }

  // Reserviert/Verbrieft je Berater (Immobilien, kumulativer Trichter) — wird
  // jetzt direkt in „Meine Struktur" auswählbar dargestellt (Feedback SJ), das
  // separate Board darunter entfällt.
  const rvList = reserviertVerbrieft(a);
  const rvMap = new Map(rvList.map((r) => [r.id, r]));

  const rows: PerfRow[] = perf.map((p) => {
    // Sparten-Trennung (Call SJ Fine-Tuning P3): ein reiner Immobilien-Berater
    // zeigt nirgends VV (und ein reiner VV-Berater kein Immo). Da jeder Deal
    // genau eine Sparte hat, gilt byPeriod = byImmo + byVv — der Kopf-Umsatz
    // ist also die Summe nur der Sparten, die der Berater tatsächlich führt.
    const bereich = a.bereichOf(p.id);
    const zeigtImmo = bereich.includes("immobilien");
    const zeigtVv = bereich.includes("vv");
    const umsatzRow =
      zeigtImmo && zeigtVv
        ? (byPeriod.get(p.id) ?? mk())
        : zeigtVv
          ? (byVv.get(p.id) ?? mk())
          : (byImmo.get(p.id) ?? mk());
    const rv = rvMap.get(p.id);
    return {
      id: p.id,
      name: p.name,
      bereich,
      offene: p.offene,
      avgDealGroesse: p.avgDealGroesse,
      dealTime: p.dealTime,
      closing: p.closing,
      storno: p.storno,
      umsatz: umsatzRow,
      umsatzImmo: zeigtImmo ? (byImmo.get(p.id) ?? mk()) : mk(),
      umsatzVv: zeigtVv ? (byVv.get(p.id) ?? mk()) : mk(),
      provision: byProv.get(p.id) ?? mk(),
      deals: (byDeals.get(p.id) ?? [])
        .filter((d) => (d.bereich === "immobilien" ? zeigtImmo : zeigtVv))
        .sort((x, y) => y.betrag - x.betrag),
      reserviert: rv?.reserviert ?? 0,
      verbrieft: rv?.verbrieft ?? 0,
      rvDeals: (rv?.deals ?? []).map((d) => ({
        dealId: d.dealId,
        dealname: d.dealname,
        kaufpreis: d.kaufpreis,
        datum: d.datum,
        status: d.abgeschlossen
          ? ("abgeschlossen" as const)
          : d.verbrieft
            ? ("verbrieft" as const)
            : ("reserviert" as const),
      })),
    };
  });

  const umsatz = umsatzGesamt(a);
  const gewonnen = a.deals.filter((d) => isWon(d, a.sMap)).length;
  // Ø Deal-Größe = Transaktionsvolumen (1.1), nicht die Provision.
  const avgGroesse = gewonnen ? volumenGewonnen(a) / gewonnen : 0;
  const storno = stornoQuote(a);
  // Drill-down-Deals hinter den 4 KPIs (Feedback SJ: jede KPI bis zum Einzel-
  // deal aufklappbar — nachvollziehen, wie die Zahl entsteht).
  const toVolDeal = (d: (typeof a.deals)[number]) => ({
    name: d.dealname,
    value: formatEUR(betragOf(d)),
    sub: d.bereich === "immobilien" ? "Immo" : "VV",
  });
  const wonDeals = a.deals.filter((d) => isWon(d, a.sMap));
  const lostDeals = a.deals.filter((d) => isLost(d, a.sMap));
  const dealTimeDeals = a.deals
    .filter((d) => a.istRealisiert(d))
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
      return { name: d.dealname, value: `${t} Tage`, sub: t, _t: t };
    })
    .sort((x, y) => y._t - x._t)
    .map((r) => ({ name: r.name, value: r.value, sub: `${r._t} Tg.` }));
  const groesseDetails = [
    {
      label: "Gewonnene Deals",
      value: String(gewonnen),
      tone: "primary",
      deals: [...wonDeals]
        .sort((x, y) => betragOf(y) - betragOf(x))
        .map(toVolDeal),
    },
  ];
  const dealTimeDetails = [
    {
      label: "Realisierte Deals",
      value: String(dealTimeDeals.length),
      tone: "info",
      deals: dealTimeDeals,
    },
  ];
  const closing = closingRateDetail(a);
  const closingDetails = [
    {
      label: "Gewonnen",
      value: String(closing.won),
      tone: "success",
      deals: wonDeals.map(toVolDeal),
    },
    {
      label: "Verloren / Storniert",
      value: String(lostDeals.length),
      tone: "muted",
      deals: lostDeals.map(toVolDeal),
    },
    {
      // Basis der Quote: alle Deals, die je den Ersttermin erreicht haben
      // (inkl. der noch offenen) — damit die Prozentzahl nachrechenbar ist:
      // Gewonnen ÷ Basis = Closing Rate (Feedback SJ).
      label: "Basis (je Ersttermin erreicht)",
      value: `${closing.won} / ${closing.base}`,
      tone: "info",
    },
  ];
  const stornoDetails = [
    {
      label: "Storniert",
      value: String(lostDeals.length),
      tone: "muted",
      deals: lostDeals.map(toVolDeal),
    },
    { label: "Gewonnen (kein Storno)", value: String(wonDeals.length), tone: "success" },
  ];
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

  // Aufschlüsselung der KPI-Zahlen (Feedback SJ): Umsatz nach Sparte + Anzahl.
  const nowMs = now.getTime();
  // Einzelne Deals hinter Immobilien/VV mitsammeln (Feedback SJ: Dropdown je
  // Sparte zeigt, aus welchen Deals sich die Zahl zusammensetzt).
  type DealPunkt = { name: string; betrag: number; sub?: string };
  const nachBetrag = (x: DealPunkt, y: DealPunkt) => y.betrag - x.betrag;
  const dealsToStat = (ds: DealPunkt[]) =>
    ds.map((d) => ({ name: d.name, value: formatEUR(d.betrag), sub: d.sub }));
  const splitUmsatz = (sinceMs: number | null) => {
    let immo = 0;
    let vv = 0;
    let n = 0;
    const immoDeals: DealPunkt[] = [];
    const vvDeals: DealPunkt[] = [];
    for (const d of a.deals) {
      const am = a.realisiertAm(d);
      if (!am) continue;
      if (sinceMs != null && new Date(am).getTime() < sinceMs) continue;
      const amt = a.umsatzOf(d);
      if (d.bereich === "immobilien") {
        immo += amt;
        immoDeals.push({ name: d.dealname, betrag: amt });
      } else {
        vv += amt;
        vvDeals.push({ name: d.dealname, betrag: amt });
      }
      n += 1;
    }
    return {
      immo,
      vv,
      n,
      immoDeals: immoDeals.sort(nachBetrag),
      vvDeals: vvDeals.sort(nachBetrag),
    };
  };
  const split7 = splitUmsatz(nowMs - 7 * 86_400_000);
  const split30 = splitUmsatz(nowMs - 30 * 86_400_000);
  const splitGesamt = splitUmsatz(null);
  const umsatzDetails = (s: ReturnType<typeof splitUmsatz>) => [
    {
      label: "Immobilien",
      value: formatEUR(s.immo),
      tone: "primary",
      deals: dealsToStat(s.immoDeals),
    },
    {
      label: "Vermögensverwaltung",
      value: formatEUR(s.vv),
      tone: "info",
      deals: dealsToStat(s.vvDeals),
    },
    { label: "Gewonnene Deals", value: String(s.n) },
  ];

  // Forecast-Aufschlüsselung je Zeitfenster (kumulativ, wie forecastGewichtet)
  // inkl. der einzelnen offenen Deals je Sparte (Feedback SJ: Dropdown).
  const mkFb = () => ({
    immo: 0,
    vv: 0,
    n: 0,
    immoDeals: [] as DealPunkt[],
    vvDeals: [] as DealPunkt[],
  });
  const fb = { t7: mkFb(), t30: mkFb(), t60: mkFb(), t90: mkFb() };
  for (const d of a.deals) {
    if (!isOpen(d, a.sMap)) continue;
    const prob = (a.sMap.get(d.stage_id)?.wahrscheinlichkeit ?? 0) / 100;
    const g = a.umsatzOf(d) * prob;
    const eintrag: DealPunkt = {
      name: d.dealname,
      betrag: g,
      sub: `${Math.round(prob * 100)} %`,
    };
    const zuFenster = (w: ReturnType<typeof mkFb>) => {
      w.n += 1;
      if (d.bereich === "immobilien") {
        w.immo += g;
        w.immoDeals.push(eintrag);
      } else {
        w.vv += g;
        w.vvDeals.push(eintrag);
      }
    };
    zuFenster(fb.t90);
    if (prob >= 0.4) zuFenster(fb.t60);
    if (prob >= 0.8) zuFenster(fb.t30);
    if (prob >= 0.9) zuFenster(fb.t7);
  }
  for (const w of [fb.t7, fb.t30, fb.t60, fb.t90]) {
    w.immoDeals.sort(nachBetrag);
    w.vvDeals.sort(nachBetrag);
  }
  const fcDetails = (s: ReturnType<typeof mkFb>) => [
    {
      label: "Immobilien",
      value: formatEUR(s.immo),
      tone: "primary",
      deals: dealsToStat(s.immoDeals),
    },
    {
      label: "Vermögensverwaltung",
      value: formatEUR(s.vv),
      tone: "info",
      deals: dealsToStat(s.vvDeals),
    },
    { label: "offene Deals im Fenster", value: String(s.n) },
  ];
  const deltaText = (v: number | null, suffix: string) =>
    v == null
      ? undefined
      : `${v >= 0 ? "+" : ""}${v.toFixed(1).replace(".", ",")} % ${suffix}`;

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
          {/* Wochenrückblick (5.6) — Umsatz-KPIs aufklappbar (Feedback SJ) */}
          <ExpandableStat
            label={a.isGf ? "Umsatz (7 Tage)" : "Mein Umsatz (7 Tage)"}
            value={formatEUR(woche.current)}
            deltaText={deltaText(wocheDelta, "vs. Vorwoche")}
            deltaUp={(wocheDelta ?? 0) >= 0}
            iconKey="cal"
            tone="success"
            details={umsatzDetails(split7)}
          />
          <ExpandableStat
            label={a.isGf ? "Umsatz (30 Tage)" : "Mein Umsatz (30 Tage)"}
            value={formatEUR(roll.current)}
            deltaText={deltaText(rollMom, "vs. 30 Tage davor")}
            deltaUp={(rollMom ?? 0) >= 0}
            iconKey="cal"
            tone="accent"
            details={umsatzDetails(split30)}
          />
          <ExpandableStat
            label={a.isGf ? "Umsatz gesamt (Provision)" : "Mein Umsatz gesamt"}
            value={formatEUR(umsatz)}
            iconKey="wallet"
            tone="accent"
            details={umsatzDetails(splitGesamt)}
          />
          <ExpandableStat
            label="Ø Deal-Größe (Volumen)"
            value={avgGroesse ? formatEUR(avgGroesse) : "—"}
            iconKey="ruler"
            tone="info"
            details={groesseDetails}
            info="Durchschnittliches Transaktionsvolumen der gewonnenen Deals (Kaufpreis bzw. BWS). Aufklappen zeigt alle Abschlüsse mit ihrem Volumen."
          />
          <ExpandableStat
            label="Ø Deal-Time"
            value={
              dealTimeTage(a) != null
                ? `${Math.round(dealTimeTage(a) as number)} Tage`
                : "—"
            }
            iconKey="timer"
            tone="warning"
            details={dealTimeDetails}
            info="Durchschnittliche Zeit vom Erstkontakt bis zum Abschluss. Aufklappen zeigt die Deal-Time jedes realisierten Deals."
          />
          <ExpandableStat
            label="Closing Rate"
            value={
              closingRate(a) != null
                ? formatProzent(closingRate(a) as number, 0)
                : "—"
            }
            iconKey="percent"
            tone="success"
            details={closingDetails}
            info="Anteil gewonnener Deals an allen, die je den ersten Termin erreicht haben (inkl. der noch offenen). Aufklappen zeigt Gewonnen, Verloren und die Basis, mit der sich die Prozentzahl nachrechnen lässt."
          />
          <ExpandableStat
            label="Stornoquote"
            value={storno != null ? formatProzent(storno, 0) : "—"}
            iconKey="undo"
            tone="danger"
            details={stornoDetails}
            info="Anteil stornierter an allen abgeschlossenen Deals. Aufklappen zeigt, welche Deals storniert wurden."
          />
        </div>

        {/* „Meine Struktur" (5.4 + Call SJ P4): Umsatz/Reserviert/Verbrieft je
            Berater — Metrik oben umschaltbar, Deals je Berater aufklappbar. Das
            frühere separate Board darunter ist hier integriert. */}
        <PerformanceView rows={rows} isGf={aFull.isGf} />

        {/* Forecast (Kap. 6): gewichtete Provision, nicht Volumen —
            inkl. Wochenforecast (5.6). */}
        <section>
          <div className="mb-3">
            <h2 className="flex items-center gap-1.5 text-base font-semibold">
              Forecast
              <InfoHint text="Jeder offene Deal wird mit der Wahrscheinlichkeit seiner Pipeline-Phase gewichtet und je nach Reife einem Zeitfenster zugeordnet: sehr späte Phasen (≥ 90 %) in den nächsten 7 Tagen, ≥ 80 % in 30, ≥ 40 % in 60, der Rest in 90 Tagen (kumulativ). So entsteht ein realistischer Erwartungswert statt reiner Volumensumme." />
            </h2>
            <p className="text-xs text-muted-foreground">
              Gewichtete {a.isGf ? "Estera-Provision" : "eigene Provision"} der
              offenen Pipeline — Näherung über die Phasen-Wahrscheinlichkeit.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ExpandableStat
              label="Nächste 7 Tage"
              value={formatEUR(forecast.t7)}
              iconKey="cal"
              tone="success"
              details={fcDetails(fb.t7)}
            />
            <ExpandableStat
              label="Nächste 30 Tage"
              value={formatEUR(forecast.t30)}
              iconKey="cal"
              tone="success"
              details={fcDetails(fb.t30)}
            />
            <ExpandableStat
              label="Nächste 60 Tage"
              value={formatEUR(forecast.t60)}
              iconKey="cal"
              tone="info"
              details={fcDetails(fb.t60)}
            />
            <ExpandableStat
              label="Nächste 90 Tage"
              value={formatEUR(forecast.t90)}
              iconKey="cal"
              tone="accent"
              details={fcDetails(fb.t90)}
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
