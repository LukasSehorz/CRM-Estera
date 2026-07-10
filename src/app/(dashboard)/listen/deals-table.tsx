"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { formatEUR, formatEURCents, formatDate } from "@/lib/format";
import { Pill } from "@/components/ui/pill";
import { Input } from "@/components/ui/input";
import { bereichLabel } from "@/config/enums";
import { cn } from "@/lib/utils";

export type DealDisplay = {
  id: string;
  dealname: string;
  bereich: string;
  phase: string;
  stagePos?: number;
  betrag: number | null;
  berater: string;
  datum: string | null;
  einbehaltBetrag?: number | null;
  faelligText?: string | null;
  offen?: boolean;
};

type SortKey = "betrag" | "datum" | "phase" | "einbehalt";
type BereichFilter = "alle" | "immobilien" | "vv";

export function DealsTable({
  rows,
  datumLabel = "Datum",
  variant = "standard",
  isGf,
  sumLabel = "Summe",
}: {
  rows: DealDisplay[];
  datumLabel?: string;
  variant?: "standard" | "einbehalt";
  isGf: boolean;
  sumLabel?: string;
}) {
  const router = useRouter();
  const einbehalt = variant === "einbehalt";

  const [q, setQ] = useState("");
  const [bereich, setBereich] = useState<BereichFilter>("alle");
  const [phase, setPhase] = useState("alle");
  const [beraterSel, setBeraterSel] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Vorhandene Bereiche/Berater/Phasen aus den Daten ableiten.
  const zeigeBereich = useMemo(
    () => new Set(rows.map((r) => r.bereich)).size > 1,
    [rows],
  );
  const beraterVorhanden = useMemo(
    () => [...new Set(rows.map((r) => r.berater))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );
  const phasenVorhanden = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of rows) if (!m.has(r.phase)) m.set(r.phase, r.stagePos ?? 0);
    return [...m.entries()].sort((a, b) => a[1] - b[1]).map(([n]) => n);
  }, [rows]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    let out = rows.filter((r) => {
      if (n && !`${r.dealname} ${r.berater} ${r.bereich}`.toLowerCase().includes(n))
        return false;
      if (zeigeBereich && bereich !== "alle" && r.bereich !== bereich) return false;
      if (phase !== "alle" && r.phase !== phase) return false;
      if (isGf && beraterSel.size > 0 && !beraterSel.has(r.berater)) return false;
      return true;
    });
    if (sortKey) {
      const dir = sortDir === "asc" ? 1 : -1;
      out = [...out].sort((a, b) => {
        let av: number | string;
        let bv: number | string;
        if (sortKey === "betrag") {
          av = a.betrag ?? -Infinity;
          bv = b.betrag ?? -Infinity;
        } else if (sortKey === "einbehalt") {
          av = a.einbehaltBetrag ?? -Infinity;
          bv = b.einbehaltBetrag ?? -Infinity;
        } else if (sortKey === "phase") {
          av = a.stagePos ?? 0;
          bv = b.stagePos ?? 0;
        } else {
          av = a.datum ?? "";
          bv = b.datum ?? "";
        }
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }
    return out;
  }, [rows, q, bereich, phase, beraterSel, sortKey, sortDir, isGf, zeigeBereich]);

  const summe = useMemo(() => {
    let gesamt = 0;
    let immo = 0;
    let vv = 0;
    let eb = 0;
    for (const r of filtered) {
      const b = r.betrag ?? 0;
      gesamt += b;
      if (r.bereich === "immobilien") immo += b;
      else if (r.bereich === "vv") vv += b;
      eb += r.einbehaltBetrag ?? 0;
    }
    return { gesamt, immo, vv, eb };
  }, [filtered]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  }
  function toggleBerater(name: string) {
    setBeraterSel((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  const cols = 5 + (isGf ? 1 : 0);

  function SortHead({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <th className="px-4 py-3 font-medium">
        <button
          type="button"
          onClick={() => toggleSort(k)}
          className="inline-flex items-center gap-1 transition-colors hover:text-foreground"
        >
          {label}
          {active ? (
            sortDir === "asc" ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
      </th>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filterleiste */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Input
            placeholder="Nach Deal, Bereich oder Berater suchen …"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="sm:max-w-xs"
          />
          {zeigeBereich && (
            <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1">
              {(["alle", "immobilien", "vv"] as const).map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBereich(b)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-sm font-medium transition-colors",
                    bereich === b
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {b === "alle" ? "Alle" : bereichLabel(b)}
                </button>
              ))}
            </div>
          )}
          {phasenVorhanden.length > 1 && (
            <select
              value={phase}
              onChange={(e) => setPhase(e.target.value)}
              aria-label="Phase filtern"
              className="h-9 rounded-md border border-border bg-surface px-2 text-sm text-foreground"
            >
              <option value="alle">Alle Phasen</option>
              {phasenVorhanden.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}
        </div>

        {isGf && beraterVorhanden.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Berater:</span>
            {beraterVorhanden.map((name) => {
              const on = beraterSel.has(name);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleBerater(name)}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    on
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {name}
                </button>
              );
            })}
            {beraterSel.size > 0 && (
              <button
                type="button"
                onClick={() => setBeraterSel(new Set())}
                className="text-xs text-muted-foreground underline hover:text-foreground"
              >
                zurücksetzen
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summenzeile */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-lg border border-border bg-surface-2 px-4 py-2.5 text-sm">
        {einbehalt ? (
          <span>
            Offener Einbehalt gesamt:{" "}
            <strong className="tabular-nums">{formatEURCents(summe.eb)}</strong>
          </span>
        ) : (
          <>
            <span>
              {sumLabel}:{" "}
              <strong className="tabular-nums">{formatEUR(summe.gesamt)}</strong>
            </span>
            {summe.immo > 0 && (
              <span className="text-muted-foreground">
                Immobilien{" "}
                <span className="tabular-nums text-foreground">
                  {formatEUR(summe.immo)}
                </span>
              </span>
            )}
            {summe.vv > 0 && (
              <span className="text-muted-foreground">
                VV{" "}
                <span className="tabular-nums text-foreground">
                  {formatEUR(summe.vv)}
                </span>
              </span>
            )}
          </>
        )}
        <span className="ml-auto text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "Deal" : "Deals"}
        </span>
      </div>

      {/* Tabelle */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">Deal</th>
              <th className="px-4 py-3 font-medium">Bereich</th>
              {einbehalt ? (
                <>
                  <th className="px-4 py-3 font-medium">BWS</th>
                  <SortHead label="Einbehalt (15 %)" k="einbehalt" />
                  <th className="px-4 py-3 font-medium">Fälligkeit</th>
                </>
              ) : (
                <>
                  <SortHead label="Phase" k="phase" />
                  <SortHead label="Betrag" k="betrag" />
                  <SortHead label={datumLabel} k="datum" />
                </>
              )}
              {isGf && <th className="px-4 py-3 font-medium">Berater</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={cols}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Keine Einträge.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => router.push(`/deals/${r.id}`)}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-surface-2"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {r.dealname}
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone="accent">{bereichLabel(r.bereich)}</Pill>
                  </td>
                  {einbehalt ? (
                    <>
                      <td className="px-4 py-3 tabular-nums">
                        {formatEUR(r.betrag)}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                        {formatEURCents(r.einbehaltBetrag)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.faelligText ?? "—"}
                        {r.offen === false && (
                          <span className="ml-2">
                            <Pill tone="success">ausgezahlt</Pill>
                          </span>
                        )}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3">
                        <Pill tone="muted">{r.phase}</Pill>
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums text-foreground">
                        {formatEUR(r.betrag)}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-muted-foreground">
                        {formatDate(r.datum)}
                      </td>
                    </>
                  )}
                  {isGf && (
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.berater}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
