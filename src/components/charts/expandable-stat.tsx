"use client";

import { useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  CalendarClock,
  ChevronDown,
  Percent,
  Ruler,
  Timer,
  Undo2,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InfoHint } from "@/components/ui/info-hint";

type Tone = "accent" | "success" | "warning" | "danger" | "info";

const TONE: Record<Tone, string> = {
  accent: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
};

// Icons können nicht als Funktion aus einer Server-Komponente übergeben
// werden — daher über einen String-Schlüssel auflösen.
const ICONS: Record<string, LucideIcon> = {
  cal: CalendarClock,
  wallet: Wallet,
  ruler: Ruler,
  timer: Timer,
  percent: Percent,
  undo: Undo2,
};

const DETAIL_TONE: Record<string, string> = {
  primary: "text-primary",
  info: "text-info",
  success: "text-success",
  muted: "text-foreground",
};

export type StatDetail = { label: string; value: string; tone?: string };

/**
 * KPI-Karte mit optionaler Aufschlüsselung (Feedback SJ): Klick zeigt, wie
 * sich der Wert zusammensetzt (z. B. Immobilien / VV). Sieht eingeklappt aus
 * wie eine normale KpiCard.
 */
export function ExpandableStat({
  label,
  value,
  deltaText,
  deltaUp,
  iconKey,
  tone = "accent",
  details,
  info,
}: {
  label: string;
  value: string;
  deltaText?: string;
  deltaUp?: boolean;
  iconKey: keyof typeof ICONS;
  tone?: Tone;
  details?: StatDetail[];
  info?: string;
}) {
  const [open, setOpen] = useState(false);
  const Icon = ICONS[iconKey] ?? Wallet;
  const canOpen = !!details && details.length > 0;

  return (
    <div
      className={cn(
        "rounded-xl border bg-surface p-5 transition-colors",
        open ? "border-primary/40" : "border-border",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          {label}
          {info && <InfoHint text={info} align="right" />}
        </span>
        <span className={cn("grid h-9 w-9 place-items-center rounded-lg", TONE[tone])}>
          <Icon className="h-4 w-4" />
        </span>
      </div>

      <button
        type="button"
        onClick={() => canOpen && setOpen((v) => !v)}
        disabled={!canOpen}
        className={cn(
          "-mx-1 mt-3 flex w-[calc(100%+0.5rem)] items-center gap-2 rounded-md px-1 py-0.5 text-left",
          canOpen && "transition-colors hover:bg-surface-2",
        )}
        aria-expanded={open}
      >
        <span className="text-3xl font-bold tracking-tight tabular-nums">
          {value}
        </span>
        {canOpen && (
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>

      {deltaText && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
              deltaUp ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
            )}
          >
            {deltaUp ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {deltaText}
          </span>
        </div>
      )}

      {canOpen && open && (
        <div className="mt-3 space-y-1.5 border-t border-border pt-3">
          {details!.map((d) => (
            <div
              key={d.label}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <span className="text-muted-foreground">{d.label}</span>
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  DETAIL_TONE[d.tone ?? "muted"],
                )}
              >
                {d.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
