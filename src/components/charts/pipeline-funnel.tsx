"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { formatEUR } from "@/lib/format";
import { lerpHex, CHART } from "./tokens";

export type FunnelDatum = {
  name: string;
  reached: number;
  volumen: number;
  wahrscheinlichkeit: number;
  /** Deals, die diese Phase erreicht haben (Klick → Pop-up). */
  deals?: { name: string; volumen: number }[];
};

/**
 * Pipeline-Trichter: zentrierte Balken, Breite ∝ erreichte Deals, Verlauf von
 * hell (oben) zu dunkel (unten). Klick auf eine Phase öffnet ein Pop-up mit den
 * Deals dieser Phase (Feedback SJ) — keine Seitennavigation.
 */
export function PipelineFunnel({ steps }: { steps: FunnelDatum[] }) {
  const [selected, setSelected] = useState<FunnelDatum | null>(null);
  const max = Math.max(1, ...steps.map((s) => s.reached));
  const n = steps.length;

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  if (steps.every((s) => s.reached === 0)) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Noch keine Deals in der Pipeline.
      </p>
    );
  }

  return (
    <>
      <ol className="space-y-1.5">
        {steps.map((s, i) => {
          const pct = Math.max(9, (s.reached / max) * 100);
          const color = lerpHex(
            CHART.accent400,
            CHART.accent600,
            n > 1 ? i / (n - 1) : 0,
          );
          const klickbar = (s.deals?.length ?? 0) > 0;
          return (
            <li
              key={s.name}
              className="grid grid-cols-[1fr_160px] items-center gap-3"
            >
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => klickbar && setSelected(s)}
                  disabled={!klickbar}
                  className="flex h-10 items-center justify-center rounded-md text-sm font-semibold shadow-sm transition-[width,box-shadow] enabled:cursor-pointer enabled:hover:ring-2 enabled:hover:ring-primary/40"
                  // Navy-Text ist auf der ganzen Gold-Skala (hell -> bronze) lesbar
                  style={{ width: `${pct}%`, background: color, color: "#0F1B2D" }}
                  title={`${s.name}: ${s.reached} Deals — anklicken für Details`}
                  aria-label={`${s.name}: ${s.reached} Deals anzeigen`}
                >
                  {s.reached}
                </button>
              </div>
              <div className="min-w-0 text-xs">
                <div className="flex items-baseline gap-1">
                  <span className="truncate font-medium text-foreground">
                    {s.name}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    · {s.wahrscheinlichkeit}%
                  </span>
                </div>
                <div className="tabular-nums text-muted-foreground">
                  {formatEUR(s.volumen)}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`Deals in Phase ${selected.name}`}
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {selected.name}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {selected.reached} Deal{selected.reached === 1 ? "" : "s"} ·{" "}
                  {formatEUR(selected.volumen)} · Phase erreicht
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Schließen"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-5 py-3">
              {(selected.deals ?? []).length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Keine Deals in dieser Phase.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {(selected.deals ?? []).map((d, i) => (
                    <li
                      key={`${d.name}-${i}`}
                      className="flex items-center justify-between gap-3 border-b border-border/60 pb-1.5 text-sm last:border-0"
                    >
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {d.name}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums text-muted-foreground">
                        {formatEUR(d.volumen)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
