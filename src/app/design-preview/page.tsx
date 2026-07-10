"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Pill } from "@/components/ui/pill";
import { AreaTrend } from "@/components/charts/area-trend";
import { BarSeries } from "@/components/charts/bar-series";
import { DonutBreakdown } from "@/components/charts/donut-breakdown";
import { PipelineFunnel } from "@/components/charts/pipeline-funnel";
import { MidnightPreview } from "./midnight-preview";

/* -------------------------------------------------------------------------
   Estera CRM — Design-Preview
   Visuelle Kontrolle aller Farb-Tokens in Light & Dark. Nur zur Ansicht,
   greift NICHT in die App-Navigation ein (eigene Route außerhalb (dashboard)).
   ------------------------------------------------------------------------- */

// Volle Klassen literal (Tailwind v4 JIT scannt nur wörtliche class-Strings).
const SURFACE_TOKENS = [
  ["--background", "bg-background"],
  ["--surface / --card", "bg-card"],
  ["--surface-2 / --secondary", "bg-secondary"],
  ["--muted", "bg-muted"],
  ["--border", "bg-border"],
] as const;

// Auf Gold-Flächen ist der lesbare Text in BEIDEN Modi dunkles Navy:
// Light -> foreground (#0F1B2D), Dark -> background (#0A121E).
const ON_GOLD = "text-foreground dark:text-background";

const BRAND_TOKENS = [
  ["--primary", "bg-primary", "text-primary-foreground"],
  ["--accent-500 (Gold)", "bg-accent-500", ON_GOLD],
  ["--accent-400 (Gold Soft)", "bg-accent-400", ON_GOLD],
  ["--accent-600 (Bronze)", "bg-accent-600", ON_GOLD],
] as const;

const STATUS_TOKENS = [
  ["success", "bg-success"],
  ["warning", "bg-warning"],
  ["danger", "bg-danger"],
  ["info", "bg-info"],
] as const;

const STAGES = [1, 2, 3, 4, 5, 6, 7, 8] as const;
const STAGE_LABELS = [
  "Neu",
  "Kontaktiert",
  "Qualifiziert",
  "Termin",
  "Angebot",
  "Finanzierung",
  "Notar",
  "Gewonnen",
];

const CHART_TOKENS = [1, 2, 3, 4, 5, 6] as const;

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-6 text-card-foreground shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        {hint ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Swatch({
  label,
  className,
  fg = "text-foreground",
  style,
}: {
  label: string;
  className?: string;
  fg?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`flex h-20 flex-col justify-end rounded-lg border border-border p-2 ${className ?? ""} ${fg}`}
      style={style}
    >
      <span className="text-[11px] font-medium leading-tight">{label}</span>
    </div>
  );
}

const TREND = [
  { label: "Jan", value: 420000 },
  { label: "Feb", value: 510000 },
  { label: "Mär", value: 470000 },
  { label: "Apr", value: 680000 },
  { label: "Mai", value: 740000 },
  { label: "Jun", value: 910000 },
];

const BARS = [
  { label: "Anna", value: 1240000 },
  { label: "Ben", value: 980000 },
  { label: "Clara", value: 1510000 },
  { label: "David", value: 720000 },
];

const DONUT = [
  { name: "Empfehlung", value: 640000 },
  { name: "Portal", value: 410000 },
  { name: "Kaltakquise", value: 220000 },
  { name: "Bestandskunde", value: 380000 },
];

const FUNNEL = [
  { name: "Leads", reached: 120, volumen: 4800000, wahrscheinlichkeit: 10 },
  { name: "Qualifiziert", reached: 74, volumen: 3200000, wahrscheinlichkeit: 25 },
  { name: "Termin", reached: 48, volumen: 2400000, wahrscheinlichkeit: 45 },
  { name: "Angebot", reached: 26, volumen: 1500000, wahrscheinlichkeit: 65 },
  { name: "Gewonnen", reached: 14, volumen: 980000, wahrscheinlichkeit: 100 },
];

export default function DesignPreviewPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = (mounted ? resolvedTheme : "dark") === "dark";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Midnight-Dashboard (Redesign) — Vorschau mit Beispieldaten */}
      <div className="mx-auto max-w-[1600px] px-6 pt-10">
        <h2 className="mb-3 text-xl font-bold tracking-tight">
          Dashboard „Midnight“ — Vorschau
        </h2>
        <MidnightPreview />
      </div>

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Kopf + Umschalter */}
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gold-contrast">Estera CRM</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Design-Preview
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Navy trägt die Fläche, Gold ist der einzige Akzent — sparsam.
              Aktueller Modus:{" "}
              <span className="font-medium text-foreground">
                {isDark ? "Dark (Referenz)" : "Light"}
              </span>
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => setTheme(isDark ? "light" : "dark")}
          >
            {isDark ? <Sun /> : <Moon />}
            {isDark ? "Heller Modus" : "Dunkler Modus"}
          </Button>
        </header>

        <div className="grid gap-6">
          {/* Flächen & Text */}
          <Section
            title="Flächen & Neutraltöne"
            hint="Navy (Dark) bzw. warmes Off-White (Light) tragen die Fläche."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {SURFACE_TOKENS.map(([label, bg]) => (
                <Swatch key={label} label={label} className={bg} fg="text-foreground" />
              ))}
            </div>
            <div className="mt-4 space-y-1 rounded-lg bg-surface-2 p-4">
              <p className="text-base text-foreground">
                Fließtext auf Fläche — <span className="font-semibold">foreground</span>
              </p>
              <p className="text-sm text-secondary-foreground/80">
                Sekundärtext — text-secondary / muted-foreground
              </p>
              <p className="text-sm text-muted-foreground">
                Hilfetext / Platzhalter — text-muted
              </p>
            </div>
          </Section>

          {/* Marke: Primär + Gold */}
          <Section
            title="Primär (Navy) & Akzent (Gold)"
            hint="Gold nur punktuell. Gold als Text immer über --gold-contrast (AA)."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {BRAND_TOKENS.map(([label, bg, fg]) => (
                <Swatch key={label} label={label} className={bg} fg={fg} />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Button>Deal anlegen</Button>
              <Button
                className={`bg-accent-500 font-semibold hover:bg-accent-600 ${ON_GOLD}`}
              >
                Abschluss buchen
              </Button>
              <Button variant="secondary">Sekundär</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Löschen</Button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <span className="text-2xl font-bold tabular-nums text-gold-contrast">
                28,4 %
              </span>
              <span className="text-sm text-muted-foreground">
                Kennzahl-Highlight (gold-contrast)
              </span>
              <span
                className="ml-auto inline-block h-8 w-40 rounded-md"
                style={{ backgroundImage: "var(--accent-gradient)" }}
                title="--accent-gradient"
              />
            </div>
          </Section>

          {/* Semantische Status */}
          <Section
            title="Semantische Status"
            hint="Deal gewonnen / ins Stocken / verloren / neutral — als Fläche und als Pill."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STATUS_TOKENS.map(([label, bg]) => (
                <Swatch key={label} label={label} className={bg} fg="text-white" />
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Pill tone="success">Gewonnen</Pill>
              <Pill tone="warning">Ins Stocken geraten</Pill>
              <Pill tone="danger">Verloren</Pill>
              <Pill tone="info">Neu</Pill>
              <Pill tone="accent">Highlight</Pill>
              <Pill tone="muted">Neutral</Pill>
            </div>
          </Section>

          {/* Pipeline-Stages */}
          <Section
            title="Pipeline-/Kanban-Stage-Farben"
            hint="8 unterscheidbare Töne — als Dot, Pill und Spaltenkopf, in beiden Modi lesbar."
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {STAGES.map((n, i) => (
                <div
                  key={n}
                  className="overflow-hidden rounded-lg border border-border bg-surface-2"
                >
                  <div
                    className="h-1.5 w-full"
                    style={{ background: `var(--stage-${n})` }}
                  />
                  <div className="flex items-center gap-2 p-3">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: `var(--stage-${n})` }}
                    />
                    <span className="truncate text-sm">{STAGE_LABELS[i]}</span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      stage-{n}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* Charts */}
          <Section
            title="Chart-Palette (recharts)"
            hint="Gold-Familie + Navy/Slate, theme-abhängig — aus chart-colors.ts / --chart-*."
          >
            <div className="mb-5 flex flex-wrap gap-2">
              {CHART_TOKENS.map((n) => (
                <span
                  key={n}
                  className="flex items-center gap-2 rounded-md border border-border px-2 py-1 text-xs"
                >
                  <span
                    className="h-3 w-3 rounded-sm"
                    style={{ background: `var(--chart-${n})` }}
                  />
                  chart-{n}
                </span>
              ))}
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium">Umsatzentwicklung</p>
                <AreaTrend data={TREND} />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Umsatz pro Berater</p>
                <BarSeries data={BARS} />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Umsatz nach Quelle</p>
                <DonutBreakdown data={DONUT} centerValue="1,65 Mio €" />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium">Pipeline-Trichter</p>
                <PipelineFunnel steps={FUNNEL} />
              </div>
            </div>
          </Section>

          {/* Beispiel-Karte */}
          <Section title="Beispiel-Karte (KPI)">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-6">
                <p className="text-sm text-muted-foreground">Pipeline-Volumen</p>
                <p className="mt-1 text-3xl font-bold tabular-nums">
                  1.284.000 €
                </p>
                <p className="mt-2 text-sm font-medium text-success">+12,5 %</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <p className="text-sm text-muted-foreground">Closing Rate</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-gold-contrast">
                  28,4 %
                </p>
                <p className="mt-2 text-sm font-medium text-danger">−3,1 %</p>
              </div>
              <div className="rounded-xl border border-border bg-card p-6">
                <p className="text-sm text-muted-foreground">Offene Deals</p>
                <p className="mt-1 text-3xl font-bold tabular-nums">47</p>
                <p className="mt-2 text-sm font-medium text-warning">
                  8 ins Stocken
                </p>
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
