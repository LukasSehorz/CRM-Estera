"use client";

import { useMemo, useState } from "react";
import { Search, Users, Handshake } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { StufeTable, type BeraterRow } from "./stufe-table";
import { TippgeberSection, type TippgeberRow } from "./tippgeber-section";

type PartnerOption = { id: string; name: string };
type OwnerOption = { id: string; name: string };
type Filter = "alle" | "berater" | "tippgeber";

/**
 * Team-Verzeichnis (Call SJ 3.3 / F6): ein Filter für Berater- und
 * Tippgeber-Liste — Umschalter (Alle / Berater / Tippgeber) + Namenssuche.
 */
export function TeamDirectory({
  beraterRows,
  partnerKandidaten,
  tippgeberRows,
  ownerOptions,
}: {
  beraterRows: BeraterRow[];
  partnerKandidaten: PartnerOption[];
  tippgeberRows: TippgeberRow[];
  ownerOptions: OwnerOption[];
}) {
  const [filter, setFilter] = useState<Filter>("alle");
  const [q, setQ] = useState("");

  const needle = q.trim().toLowerCase();
  const berater = useMemo(
    () =>
      needle
        ? beraterRows.filter((r) => r.name.toLowerCase().includes(needle))
        : beraterRows,
    [beraterRows, needle],
  );
  const tippgeber = useMemo(
    () =>
      needle
        ? tippgeberRows.filter(
            (r) =>
              r.name.toLowerCase().includes(needle) ||
              r.ownerName.toLowerCase().includes(needle),
          )
        : tippgeberRows,
    [tippgeberRows, needle],
  );

  const showBerater = filter !== "tippgeber";
  const showTippgeber = filter !== "berater";

  const tabs: { key: Filter; label: string; count: number }[] = [
    { key: "alle", label: "Alle", count: beraterRows.length + tippgeberRows.length },
    { key: "berater", label: "Berater", count: beraterRows.length },
    { key: "tippgeber", label: "Tippgeber", count: tippgeberRows.length },
  ];

  return (
    <div className="space-y-4">
      {/* Filterleiste */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex rounded-lg border border-border bg-surface p-0.5">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                filter === t.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.key === "berater" && <Users className="h-3.5 w-3.5" />}
              {t.key === "tippgeber" && <Handshake className="h-3.5 w-3.5" />}
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs tabular-nums",
                  filter === t.key
                    ? "bg-primary-foreground/20"
                    : "bg-surface-2 text-muted-foreground",
                )}
              >
                {t.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nach Name suchen …"
            className="pl-9"
          />
        </div>
      </div>

      {showBerater && (
        <div className="space-y-2">
          <p className="max-w-2xl text-sm text-muted-foreground">
            Die Stufe bestimmt den persönlichen Provisionsanteil (Netto-Provision
            × Stufe). Die Sparten steuern, welche Bereiche der Berater sieht —
            durchgesetzt in der Datenbank, nicht nur in der Oberfläche. Die
            Monatsziele (eigene Provision, gemeinsam mit dem Berater vereinbart)
            treiben die Ziel-Box im Berater-Dashboard.
          </p>
          {berater.length > 0 ? (
            <StufeTable rows={berater} partnerKandidaten={partnerKandidaten} />
          ) : (
            <EmptyHint text="Kein Berater gefunden." />
          )}
        </div>
      )}

      {showTippgeber &&
        (tippgeber.length > 0 || !needle ? (
          <TippgeberSection rows={tippgeber} ownerOptions={ownerOptions} />
        ) : (
          <EmptyHint text="Kein Tippgeber gefunden." />
        ))}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
