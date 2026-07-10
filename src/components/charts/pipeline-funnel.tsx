import { formatEUR } from "@/lib/format";
import { lerpHex, CHART } from "./tokens";

export type FunnelDatum = {
  name: string;
  reached: number;
  volumen: number;
  wahrscheinlichkeit: number;
};

/**
 * Pipeline-Trichter: zentrierte Balken, Breite ∝ erreichte Deals, Verlauf von
 * hell (oben) zu dunkel (unten). Werte rechts daneben. Reines CSS/SVG-freies
 * Markup — passt in beide Themes.
 */
export function PipelineFunnel({ steps }: { steps: FunnelDatum[] }) {
  const max = Math.max(1, ...steps.map((s) => s.reached));
  const n = steps.length;

  if (steps.every((s) => s.reached === 0)) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Noch keine Deals in der Pipeline.
      </p>
    );
  }

  return (
    <ol className="space-y-1.5">
      {steps.map((s, i) => {
        const pct = Math.max(9, (s.reached / max) * 100);
        const color = lerpHex(CHART.accent400, CHART.accent600, n > 1 ? i / (n - 1) : 0);
        return (
          <li
            key={s.name}
            className="grid grid-cols-[1fr_160px] items-center gap-3"
          >
            <div className="flex justify-center">
              <div
                className="flex h-10 items-center justify-center rounded-md text-sm font-semibold shadow-sm transition-[width]"
                // Navy-Text ist auf der ganzen Gold-Skala (hell -> bronze) lesbar
                style={{ width: `${pct}%`, background: color, color: "#0F1B2D" }}
                title={`${s.name}: ${s.reached}`}
              >
                {s.reached}
              </div>
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
  );
}
