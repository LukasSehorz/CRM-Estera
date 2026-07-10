import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "accent" | "success" | "warning" | "danger" | "info";

const TONE: Record<Tone, string> = {
  accent: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
};

/**
 * KPI-Karte: großer Wert, Label, optionales Delta (in %), Icon in Akzent-Pill.
 * `href` macht die Karte klickbar (4.6: KPI → dahinterliegende Liste),
 * `sub` zeigt eine kleine Zusatzzeile (z. B. „Immobilien X · VV Y").
 */
export function KpiCard({
  label,
  value,
  delta,
  deltaLabel,
  sub,
  href,
  icon: Icon,
  tone = "accent",
}: {
  label: string;
  value: string;
  delta?: number | null;
  deltaLabel?: string;
  sub?: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: Tone;
}) {
  const up = (delta ?? 0) >= 0;
  const inner = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className={cn("grid h-9 w-9 place-items-center rounded-lg", TONE[tone])}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold tracking-tight tabular-nums">
        {value}
      </div>
      {delta != null && (
        <div className="mt-2 flex items-center gap-1.5 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 font-medium",
              up ? "bg-success/10 text-success" : "bg-danger/10 text-danger",
            )}
          >
            {up ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {up ? "+" : ""}
            {delta.toFixed(1).replace(".", ",")} %
          </span>
          {deltaLabel && (
            <span className="text-muted-foreground">{deltaLabel}</span>
          )}
        </div>
      )}
      {sub && (
        <div className="mt-2 text-xs tabular-nums text-muted-foreground">
          {sub}
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary/40"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-surface p-5">{inner}</div>
  );
}
