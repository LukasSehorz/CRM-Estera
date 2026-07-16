"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { AreaTrend } from "@/components/charts/area-trend";

/* ──────────────────────────────────────────────────────────────────────
   Umsatzentwicklung (Midnight): klickbarer Zeitraum-Schalter
   30 Tage · 3 Monate · 6 Monate · 12 Monate. Reine Präsentation —
   alle Reihen kommen fertig berechnet aus der Server-Seite.
   ────────────────────────────────────────────────────────────────────── */

export type UmsatzRange = {
  key: string;
  label: string;
  points: { label: string; value: number }[];
  /** Kennzahl-Zeile oben, z. B. „Ø Umsatz pro Monat“ → „39 T€“ */
  statLabel: string;
  statValue: string;
};

function DeltaPill({ value }: { value: number | null }) {
  if (value == null) return null;
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-xs font-semibold",
        up ? "bg-success/15 text-success" : "bg-danger/15 text-danger",
      )}
    >
      {up ? "↗" : "↘"} {up ? "+" : ""}
      {value.toFixed(2).replace(".", ",")} %
    </span>
  );
}

export function OverviewCard({
  ranges,
  mom,
  className,
}: {
  ranges: UmsatzRange[];
  mom: number | null;
  className?: string;
}) {
  const [aktiv, setAktiv] = useState(ranges[ranges.length - 1]?.key ?? "");
  const range = ranges.find((r) => r.key === aktiv) ?? ranges[0];

  return (
    <section
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-300 hover:border-accent-500/40 hover:shadow-[0_0_36px_-10px_color-mix(in_srgb,var(--accent-500)_45%,transparent)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold">Umsatzentwicklung</h2>
        <Info className="h-4 w-4 text-muted-foreground" aria-hidden />
      </div>
      {/* Umsatz-Zahl prominent: ausgeschrieben in €, ohne Cent (Feedback SJ) */}
      <div className="mt-3">
        <p className="text-xs text-muted-foreground">{range.statLabel}</p>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-[2rem] font-bold leading-none tracking-tight tabular-nums text-foreground">
            {range.statValue}
          </span>
          <DeltaPill value={mom} />
        </div>
      </div>

      {/* Zeitraum-Schalter: echte Buttons, in Hell & Dunkel über Tokens */}
      <div
        role="tablist"
        aria-label="Zeitraum wählen"
        className="mt-4 flex items-center gap-1 rounded-full border border-border bg-surface-2 p-1 text-xs font-medium"
      >
        {ranges.map((r) => {
          const istAktiv = r.key === aktiv;
          return (
            <button
              key={r.key}
              type="button"
              role="tab"
              aria-selected={istAktiv}
              onClick={() => setAktiv(r.key)}
              className={cn(
                "flex-1 cursor-pointer whitespace-nowrap rounded-full px-2.5 py-1.5 text-center transition-colors focus-visible:outline-2 focus-visible:outline-ring",
                istAktiv
                  ? "bg-accent-500 font-semibold text-background shadow-sm"
                  : "text-muted-foreground hover:bg-surface hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex-1">
        <AreaTrend data={range.points} />
      </div>

      {mom != null && (
        <p className="mt-3 text-xs text-muted-foreground">
          <span
            className={cn(
              "font-semibold tabular-nums",
              mom >= 0 ? "text-success" : "text-danger",
            )}
          >
            {mom >= 0 ? "+" : ""}
            {mom.toFixed(2).replace(".", ",")} %
          </span>{" "}
          Wachstum: letzte 30 Tage vs. die 30 Tage davor
        </p>
      )}
    </section>
  );
}
