"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatEUR } from "@/lib/format";
import { bereichLabel } from "@/config/enums";
import { cn } from "@/lib/utils";

type Bucket = { offene: number; pipeline: number; umsatz: number };
export type BeraterRow = {
  id: string;
  name: string;
  istGf: boolean;
  kontakte: number;
  immo: Bucket;
  vv: Bucket;
};
type Scope = "gesamt" | "immobilien" | "vv";

// Scope-Wert ("immobilien"/"vv") → Bucket-Feld (immo/vv).
const bucketOf = (r: BeraterRow, s: "immobilien" | "vv") =>
  s === "immobilien" ? r.immo : r.vv;
const umsatzFor = (r: BeraterRow, scope: Scope) =>
  scope === "gesamt" ? r.immo.umsatz + r.vv.umsatz : bucketOf(r, scope).umsatz;

/**
 * Berater-Übersicht strikt getrennt nach Immobilien / VV (Wunsch Schleife 3,
 * Punkt 10): die beiden Welten werden nie in einer Zahl vermischt. „Gesamt"
 * ist optional und mit Hinweis, dass dort unterschiedliche Größen summiert
 * werden.
 */
export function BeraterTable({
  rows,
  isGf,
  optionen,
}: {
  rows: BeraterRow[];
  isGf: boolean;
  optionen: Scope[];
}) {
  const [scope, setScope] = useState<Scope>(optionen[0]);

  const val = (r: BeraterRow, key: keyof Bucket) =>
    scope === "gesamt" ? r.immo[key] + r.vv[key] : bucketOf(r, scope)[key];

  const sorted = useMemo(
    () => [...rows].sort((a, b) => umsatzFor(b, scope) - umsatzFor(a, scope)),
    [rows, scope],
  );

  return (
    <div className="space-y-4">
      {optionen.length > 1 && (
        <div
          role="tablist"
          aria-label="Bereich wählen"
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1"
        >
          {optionen.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={scope === s}
              onClick={() => setScope(s)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                scope === s
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s === "gesamt" ? "Gesamt" : bereichLabel(s)}
            </button>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Berater</th>
              <th className="px-4 py-3 font-medium">Kontakte</th>
              <th className="px-4 py-3 font-medium">Offene Deals</th>
              <th className="px-4 py-3 font-medium">Pipeline-Volumen</th>
              <th className="px-4 py-3 font-medium">Umsatz (Provision)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Keine Daten.
                </td>
              </tr>
            ) : (
              sorted.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {isGf ? (
                      <Link
                        href={`/dashboard/berater/${r.id}`}
                        className="text-primary hover:underline"
                      >
                        {r.name}
                      </Link>
                    ) : (
                      r.name
                    )}
                    {r.istGf && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (GF)
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums">{r.kontakte}</td>
                  <td className="px-4 py-3 tabular-nums">{val(r, "offene")}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {formatEUR(val(r, "pipeline"))}
                  </td>
                  <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                    {formatEUR(val(r, "umsatz"))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {scope === "gesamt" && (
        <p className="text-xs text-muted-foreground">
          Hinweis: „Gesamt“ summiert Immobilien-Kaufpreise und VV-BWS —
          unterschiedliche Größen. Für einen sauberen Vergleich Immobilien und
          Vermögensverwaltung getrennt betrachten.
        </p>
      )}
    </div>
  );
}
