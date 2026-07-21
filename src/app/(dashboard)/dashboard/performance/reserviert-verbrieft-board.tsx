"use client";

import { Fragment, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEUR } from "@/lib/format";
import { InfoHint } from "@/components/ui/info-hint";
import { Pill } from "@/components/ui/pill";
import type { ReserviertVerbrieft } from "@/lib/analytics";

/**
 * GF-Board „wer hat wie viel reserviert / verbrieft" (Call SJ Fine-Tuning P4),
 * nur Immobilien. Kaufpreis-Volumen je Berater; verbrieft = beim Notar. Jede
 * Zeile ist aufklappbar (welche Deals?), Berater-Name verlinkt in die Details.
 */
export function ReserviertVerbrieftBoard({
  rows,
  isGf = false,
}: {
  rows: ReserviertVerbrieft[];
  isGf?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  if (rows.length === 0) return null;
  const maxR = Math.max(...rows.map((r) => r.reserviert), 1);
  const maxV = Math.max(...rows.map((r) => r.verbrieft), 1);
  const summeR = rows.reduce((s, r) => s + r.reserviert, 0);
  const summeV = rows.reduce((s, r) => s + r.verbrieft, 0);

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-1 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-base font-semibold">
          Reserviert &amp; Verbrieft
          <InfoHint text="Kaufpreis-Volumen je Berater (nur Immobilien). Reserviert = der Deal hat mindestens die Phase »Objekt reserviert« erreicht; verbrieft = er wurde zum Notar gebracht (Phase »Notartermin« erreicht). Kumulativ — verbriefte Deals zählen auch im Reserviert-Topf mit. Stornierte zählen nicht. Zeile aufklappen zeigt die einzelnen Deals mit ihrem Status." />
        </h2>
        <span className="text-xs text-muted-foreground">Immobilien</span>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Reserviert = ab Phase »Objekt reserviert« · Verbrieft = beim Notar (ab
        »Notartermin«, Teilmenge). Zeile anklicken zeigt die Deals.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-2 py-2 font-medium">Berater</th>
              <th className="px-2 py-2 font-medium">Reserviert</th>
              <th className="px-2 py-2 font-medium">Verbrieft</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const offen = open === r.id;
              return (
                <Fragment key={r.id}>
                  <tr
                    className={cn(
                      "border-b border-border last:border-0",
                      offen && "bg-surface-2/40",
                    )}
                  >
                    <td className="px-2 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {isGf ? (
                          <Link
                            href={`/dashboard/berater/${r.id}`}
                            className="font-medium text-primary hover:underline"
                          >
                            {r.name}
                          </Link>
                        ) : (
                          <span className="font-medium text-foreground">
                            {r.name}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            setOpen((v) => (v === r.id ? null : r.id))
                          }
                          aria-expanded={offen}
                          aria-label={`Deals von ${r.name} anzeigen`}
                          className="grid h-5 w-5 place-items-center rounded text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                        >
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 transition-transform",
                              offen && "rotate-180",
                            )}
                          />
                        </button>
                      </div>
                    </td>
                    <td className="px-2 py-2.5">
                      <Bar value={r.reserviert} max={maxR} tone="info" />
                    </td>
                    <td className="px-2 py-2.5">
                      <Bar value={r.verbrieft} max={maxV} tone="success" />
                    </td>
                  </tr>
                  {offen && (
                    <tr className="border-b border-border bg-surface-2/40">
                      <td colSpan={3} className="px-2 pb-3">
                        <ul className="ml-1 space-y-1">
                          {r.deals.map((d) => (
                            <li
                              key={d.dealId}
                              className="flex items-center justify-between gap-3 text-xs"
                            >
                              <span className="min-w-0 flex-1 truncate text-foreground">
                                {d.dealname}
                              </span>
                              <span className="flex shrink-0 items-center gap-2">
                                <Pill tone={d.verbrieft ? "success" : "info"}>
                                  {d.verbrieft ? "Verbrieft" : "Reserviert"}
                                </Pill>
                                <span className="w-24 text-right font-semibold tabular-nums text-foreground">
                                  {formatEUR(d.kaufpreis)}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="text-xs font-medium text-muted-foreground">
              <td className="px-2 pt-3">Gesamt</td>
              <td className="px-2 pt-3 tabular-nums text-info">
                {formatEUR(summeR)}
              </td>
              <td className="px-2 pt-3 tabular-nums text-success">
                {formatEUR(summeV)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function Bar({
  value,
  max,
  tone,
}: {
  value: number;
  max: number;
  tone: "info" | "success";
}) {
  const pct = max > 0 && value > 0 ? Math.max(3, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-surface-2">
        <div
          className={cn(
            "h-full rounded-full",
            tone === "info" ? "bg-info" : "bg-success",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 tabular-nums text-foreground">
        {formatEUR(value)}
      </span>
    </div>
  );
}
