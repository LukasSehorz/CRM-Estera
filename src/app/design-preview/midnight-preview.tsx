"use client";

import { AlarmClock, CalendarDays, Flame } from "lucide-react";
import { MidnightHeader } from "@/components/layout/midnight-header";
import { HeuteTaskItem } from "@/app/(dashboard)/dashboard/heute-task-item";
import { ChartCard } from "@/components/charts/chart-card";
import { PipelineFunnel } from "@/components/charts/pipeline-funnel";
import { DonutBreakdown } from "@/components/charts/donut-breakdown";
import {
  BalanceCard,
  ForecastCard,
  DealsCard,
} from "@/app/(dashboard)/dashboard/midnight-cards";
import {
  OverviewCard,
  type UmsatzRange,
} from "@/app/(dashboard)/dashboard/overview-card";

/* -------------------------------------------------------------------------
   Midnight-Dashboard-Vorschau (nur /design-preview): identische Komponenten
   wie /dashboard, aber mit festen Beispielzahlen — zur visuellen Abnahme
   ohne Login. Die echte Seite zieht dieselben Karten mit Live-Daten.
   ------------------------------------------------------------------------- */

const TREND = [
  { label: "Aug", value: 8200 },
  { label: "Sep", value: 11600 },
  { label: "Okt", value: 9400 },
  { label: "Nov", value: 14100 },
  { label: "Dez", value: 12500 },
  { label: "Jan", value: 16800 },
  { label: "Feb", value: 15200 },
  { label: "Mär", value: 19400 },
  { label: "Apr", value: 17800 },
  { label: "Mai", value: 22600 },
  { label: "Jun", value: 26400 },
  { label: "Jul", value: 31200 },
];

const DEALS = [
  { id: "1", dealname: "ETW Schwabing — Fam. Berger", bereich: "immobilien" as const, created_at: "2026-07-08", stageName: "Finanzierung", betrag: 412000 },
  { id: "2", dealname: "VV-Mandat Chr. Sailer", bereich: "vv" as const, created_at: "2026-07-07", stageName: "Angebot", betrag: 250000 },
  { id: "3", dealname: "MFH Haidhausen — Dr. Wolf", bereich: "immobilien" as const, created_at: "2026-07-05", stageName: "Besichtigung", betrag: 1150000 },
  { id: "4", dealname: "VV-Mandat R. Antonopoulos", bereich: "vv" as const, created_at: "2026-07-03", stageName: "Erstgespräch", betrag: 180000 },
  { id: "5", dealname: "ETW Sendling — M. Huber", bereich: "immobilien" as const, created_at: "2026-07-01", stageName: "Reserviert", betrag: 385000 },
  { id: "6", dealname: "ETW Pasing — S. Klein", bereich: "immobilien" as const, created_at: "2026-06-28", stageName: "Notartermin", betrag: 298000 },
];

const FUNNEL_IMMO = [
  { name: "Lead", reached: 42, volumen: 9800000, wahrscheinlichkeit: 10 },
  { name: "Erstgespräch", reached: 28, volumen: 6900000, wahrscheinlichkeit: 25 },
  { name: "Besichtigung", reached: 17, volumen: 4300000, wahrscheinlichkeit: 45 },
  { name: "Reserviert", reached: 9, volumen: 2600000, wahrscheinlichkeit: 70 },
  { name: "Notartermin", reached: 5, volumen: 1400000, wahrscheinlichkeit: 90 },
];

const FUNNEL_VV = [
  { name: "Lead", reached: 31, volumen: 5200000, wahrscheinlichkeit: 10 },
  { name: "Erstgespräch", reached: 19, volumen: 3600000, wahrscheinlichkeit: 30 },
  { name: "Angebot", reached: 11, volumen: 2100000, wahrscheinlichkeit: 55 },
  { name: "Abschlussreife", reached: 6, volumen: 1200000, wahrscheinlichkeit: 85 },
];

// Beispiel-Tagesreihe (30 Tage) + Zeitraum-Definitionen für den Schalter
const DAILY30 = [
  0, 0, 4800, 0, 0, 9200, 0, 0, 0, 12400, 0, 6800, 0, 0, 15600, 0, 0, 0,
  11200, 0, 0, 18400, 0, 7600, 0, 0, 21800, 0, 0, 16400,
].map((value, i) => {
  // 30 Kalendertage ab 11.06. (Beispieldaten, korrekt über den Monatswechsel)
  const d = new Date(Date.UTC(2026, 5, 11 + i));
  const label = `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.`;
  return { label, value };
});

const summe = (pts: { value: number }[]) =>
  pts.reduce((s, p) => s + p.value, 0);
const RANGES: UmsatzRange[] = [
  { key: "30t", label: "30 Tage", points: DAILY30, statLabel: "Summe 30 Tage", statValue: "124 T€" },
  { key: "3m", label: "3 Monate", points: TREND.slice(-3), statLabel: "Ø Umsatz pro Monat", statValue: `${Math.round(summe(TREND.slice(-3)) / 3 / 1000)} T€` },
  { key: "6m", label: "6 Monate", points: TREND.slice(-6), statLabel: "Ø Umsatz pro Monat", statValue: `${Math.round(summe(TREND.slice(-6)) / 6 / 1000)} T€` },
  { key: "12m", label: "12 Monate", points: TREND, statLabel: "Ø Umsatz pro Monat", statValue: `${Math.round(summe(TREND) / 12 / 1000)} T€` },
];

const QUELLE = [
  { name: "Empfehlung", value: 74000 },
  { name: "Website", value: 43000 },
  { name: "Social Media", value: 31000 },
  { name: "Kaltakquise", value: 21000 },
  { name: "Event", value: 12000 },
];

/** Statischer „Heute“-Kasten (die echte Seite lädt ihn live aus dem CRM). */
function HeutePreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Heute</h2>
          <p className="text-xs text-muted-foreground">
            Deine Handlungsliste — fällige Aufgaben, Termine, festhängende
            Deals.
          </p>
        </div>
        <span className="shrink-0 text-sm font-medium text-primary">
          Alle Aufgaben →
        </span>
      </div>
      <div className="mt-4 space-y-5">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <AlarmClock className="h-3.5 w-3.5" /> Aufgaben
            <span className="rounded-full bg-danger/15 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
              2 überfällig
            </span>
          </p>
          <ul className="space-y-1">
            <HeuteTaskItem
              id="p1"
              titel="Finanzierungsbestätigung prüfen und Unterlagen nachfassen"
              faelligAm="2026-07-03"
              ueberfaellig
              kontaktName="Sophie Baumgartner"
              kontaktId="p1"
            />
            <HeuteTaskItem
              id="p2"
              titel="Exposé-Feedback einholen"
              faelligAm="2026-07-10"
              ueberfaellig={false}
              kontaktName="Fabian Schuster"
              kontaktId="p2"
            />
          </ul>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" /> Termine heute
          </p>
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center gap-2">
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary">Notartermin</span>
              <span className="truncate">ETW Pasing — S. Klein</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="rounded-full bg-info/15 px-1.5 py-0.5 text-[10px] font-semibold text-info">Termin</span>
              <span className="truncate">VV-Mandat Chr. Sailer</span>
            </li>
          </ul>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Flame className="h-3.5 w-3.5" /> Ohne Aktivität (≥ 7 Tage)
          </p>
          <ul className="space-y-1.5 text-sm">
            <li className="flex items-center justify-between gap-2">
              <span className="truncate">MFH Haidhausen — Dr. Wolf</span>
              <span className="shrink-0 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">12 T</span>
            </li>
            <li className="flex items-center justify-between gap-2">
              <span className="truncate">VV-Mandat R. Antonopoulos</span>
              <span className="shrink-0 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">9 T</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function MidnightPreview() {
  return (
    <section className="theme-midnight relative overflow-hidden rounded-2xl border border-border bg-background text-foreground">
      {/* Ambient-Glow wie im echten App-Shell (dort im Dashboard-Layout) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div
          className="absolute -top-48 right-[-12%] h-[38rem] w-[38rem] rounded-full"
          style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--accent-500) 13%, transparent), transparent 70%)" }}
        />
        <div
          className="absolute bottom-[-22%] left-[-8%] h-[42rem] w-[42rem] rounded-full"
          style={{ background: "radial-gradient(closest-side, color-mix(in srgb, var(--accent-600) 12%, transparent), transparent 72%)" }}
        />
      </div>
      <MidnightHeader
        vorname="Ioannis"
        name="Ioannis Orfanidis"
        rolle="Geschäftsführer"
        fotoUrl="/dashboard/profil-ioannis.png"
      />
      <div className="relative z-10 space-y-4 px-6 py-6">
        <div className="grid items-stretch gap-4 xl:grid-cols-12">
          <OverviewCard ranges={RANGES} mom={12.83} className="xl:col-span-4" />
          <BalanceCard
            umsatz30={181000}
            mom={12.83}
            gewonnen={8}
            umsatzGesamt={181000}
            isGf
            className="xl:col-span-5"
          />
          <ForecastCard
            werte={{
              volumen: 1240000,
              erwartet: 74400,
              gewichtet: 31850,
              einbehalt: 9600,
              naechsteFaelligkeit: "2026-09-15",
            }}
            offeneDeals={14}
            isGf
            className="xl:col-span-3"
          />
          <div className="xl:col-span-4">
            <HeutePreview />
          </div>
          <DealsCard deals={DEALS} className="xl:col-span-8" />
          <ChartCard
            title="Funnel Immobilien"
            subtitle="Je Phase erreicht (kumulativ)"
            className="xl:col-span-6"
          >
            <PipelineFunnel steps={FUNNEL_IMMO} />
          </ChartCard>
          <ChartCard
            title="Funnel Vermögensverwaltung"
            subtitle="Je Phase erreicht (kumulativ)"
            className="xl:col-span-6"
          >
            <PipelineFunnel steps={FUNNEL_VV} />
          </ChartCard>
          <ChartCard
            title="Umsatz nach Quelle"
            subtitle="Provision aus gewonnenen Deals je Leadquelle"
            className="xl:col-span-12"
          >
            <div className="mx-auto w-full max-w-2xl">
              <DonutBreakdown data={QUELLE} centerValue="181 T€" />
            </div>
          </ChartCard>
        </div>
      </div>
    </section>
  );
}
