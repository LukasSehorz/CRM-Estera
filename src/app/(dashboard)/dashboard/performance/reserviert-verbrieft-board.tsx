"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEUR } from "@/lib/format";
import { InfoHint } from "@/components/ui/info-hint";
import { Pill } from "@/components/ui/pill";
import type { ReserviertVerbrieft } from "@/lib/analytics";

type MetrikKey = "umsatz" | "reserviert" | "verbrieft";
type Ansicht = "alle" | MetrikKey;

const METRIKEN: {
  key: MetrikKey;
  label: string;
  bar: string;
  text: string;
  desc: string;
}[] = [
  { key: "reserviert", label: "Reserviert", bar: "bg-info", text: "text-info", desc: "ab Objekt reserviert" },
  { key: "verbrieft", label: "Verbrieft", bar: "bg-primary", text: "text-primary", desc: "beim Notar" },
  { key: "umsatz", label: "Umsatz", bar: "bg-success", text: "text-success", desc: "abgeschlossen" },
];

/**
 * Board „Umsatz / Reserviert / Verbrieft je Berater" (Call SJ Fine-Tuning P4 +
 * Ausbau): Balken nebeneinander, umschaltbar (alle / einzeln), pro Berater
 * aufklappbar bis zum Einzeldeal. Nur Immobilien. Kumulativer Trichter
 * Reserviert ⊇ Verbrieft ⊇ Umsatz.
 */
export function ReserviertVerbrieftBoard({
  rows,
  isGf = false,
}: {
  rows: ReserviertVerbrieft[];
  isGf?: boolean;
}) {
  const [ansicht, setAnsicht] = useState<Ansicht>("alle");
  const [open, setOpen] = useState<string | null>(null);

  const sichtbar = ansicht === "alle" ? METRIKEN : METRIKEN.filter((m) => m.key === ansicht);
  const sortKey: MetrikKey = ansicht === "alle" ? "reserviert" : ansicht;

  const { sorted, max, summe } = useMemo(() => {
    const max: Record<MetrikKey, number> = {
      umsatz: Math.max(1, ...rows.map((r) => r.umsatz)),
      reserviert: Math.max(1, ...rows.map((r) => r.reserviert)),
      verbrieft: Math.max(1, ...rows.map((r) => r.verbrieft)),
    };
    const summe: Record<MetrikKey, number> = {
      umsatz: rows.reduce((s, r) => s + r.umsatz, 0),
      reserviert: rows.reduce((s, r) => s + r.reserviert, 0),
      verbrieft: rows.reduce((s, r) => s + r.verbrieft, 0),
    };
    const sorted = [...rows].sort((a, b) => b[sortKey] - a[sortKey]);
    return { sorted, max, summe };
  }, [rows, sortKey]);

  if (rows.length === 0) return null;

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 text-base font-semibold">
          Umsatz, Reserviert &amp; Verbrieft
          <InfoHint text="Kaufpreis-Volumen je Berater (nur Immobilien), kumulativer Trichter: Reserviert (ab Phase »Objekt reserviert«) ⊇ Verbrieft (beim Notar, Phase »Notartermin«) ⊇ Umsatz (Kauf abgeschlossen). Stornierte zählen nicht. Umschalten zwischen allen dreien oder einer Kennzahl; Zeile aufklappen zeigt die Deals mit Status." />
        </h2>
        <div className="flex items-center gap-2">
          {/* Umschalter: alle / einzelne Kennzahl (Call SJ) */}
          <div className="flex gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5">
            {(["alle", "reserviert", "verbrieft", "umsatz"] as Ansicht[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setAnsicht(k)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                  ansicht === k
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {k === "alle" ? "Alle" : k}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted-foreground">Immobilien</span>
        </div>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        Reserviert ⊇ Verbrieft ⊇ Umsatz (Kaufpreis-Volumen). Zeile anklicken zeigt
        die Deals mit Status.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-2 py-2 font-medium">Berater</th>
              {sichtbar.map((m) => (
                <th key={m.key} className="px-2 py-2 font-medium">
                  {m.label}
                  <span className="ml-1 font-normal opacity-70">· {m.desc}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => {
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
                          onClick={() => setOpen((v) => (v === r.id ? null : r.id))}
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
                    {sichtbar.map((m) => (
                      <td key={m.key} className="px-2 py-2.5">
                        <Bar value={r[m.key]} max={max[m.key]} bar={m.bar} />
                      </td>
                    ))}
                  </tr>
                  {offen && (
                    <tr className="border-b border-border bg-surface-2/40">
                      <td colSpan={sichtbar.length + 1} className="px-2 pb-3">
                        <ul className="ml-1 space-y-1">
                          {r.deals.map((d) => {
                            const status = d.abgeschlossen
                              ? { label: "Abgeschlossen", tone: "success" as const }
                              : d.verbrieft
                                ? { label: "Verbrieft", tone: "accent" as const }
                                : { label: "Reserviert", tone: "info" as const };
                            return (
                              <li
                                key={d.dealId}
                                className="flex items-center justify-between gap-3 text-xs"
                              >
                                <span className="min-w-0 flex-1 truncate text-foreground">
                                  {d.dealname}
                                </span>
                                <span className="flex shrink-0 items-center gap-2">
                                  <Pill tone={status.tone}>{status.label}</Pill>
                                  <span className="w-24 text-right font-semibold tabular-nums text-foreground">
                                    {formatEUR(d.kaufpreis)}
                                  </span>
                                </span>
                              </li>
                            );
                          })}
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
              {sichtbar.map((m) => (
                <td key={m.key} className={cn("px-2 pt-3 tabular-nums", m.text)}>
                  {formatEUR(summe[m.key])}
                </td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function Bar({ value, max, bar }: { value: number; max: number; bar: string }) {
  const pct = max > 0 && value > 0 ? Math.max(3, (value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-full max-w-[120px] overflow-hidden rounded-full bg-surface-2">
        <div className={cn("h-full rounded-full", bar)} style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 tabular-nums text-foreground">{formatEUR(value)}</span>
    </div>
  );
}
