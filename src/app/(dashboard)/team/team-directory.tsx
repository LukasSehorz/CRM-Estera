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
  isGf = true,
  currentUserId,
}: {
  beraterRows: BeraterRow[];
  partnerKandidaten: PartnerOption[];
  tippgeberRows: TippgeberRow[];
  ownerOptions: OwnerOption[];
  /** Stufe/Rolle/Anbindung sind GF-Hoheit (DB erzwingt es) — Berater sehen
   *  ihre Downline nur lesend. */
  isGf?: boolean;
  /** Eigene ID: Ziele der DIREKTEN Berater darf ein Berater setzen. */
  currentUserId?: string;
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

  // Downline je Berater (2.8): wer arbeitet unter ihm (Sub-Berater + Tippgeber)?
  const childMap = useMemo(() => {
    const m: Record<
      string,
      {
        berater: { id: string; name: string; stufe: string }[];
        tippgeber: { id: string; name: string; satz: string }[];
      }
    > = {};
    for (const r of beraterRows) m[r.id] = { berater: [], tippgeber: [] };
    for (const r of beraterRows) {
      if (r.parentId && m[r.parentId])
        m[r.parentId].berater.push({ id: r.id, name: r.name, stufe: r.stufe });
    }
    for (const t of tippgeberRows) {
      if (m[t.ownerId])
        m[t.ownerId].tippgeber.push({
          id: t.id,
          name: t.name,
          satz: t.provisionSatz,
        });
    }
    return m;
  }, [beraterRows, tippgeberRows]);

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
            {isGf
              ? "Die Stufe bestimmt den persönlichen Provisionsanteil (Netto-Provision × Stufe). Die Sparten steuern, welche Bereiche der Berater sieht — durchgesetzt in der Datenbank, nicht nur in der Oberfläche. Die Monatsziele (eigene Provision) legst du hier je Berater fest; sie treiben die Ziel-Box im Berater-Dashboard."
              : "Deine Downline. Stufe und Anbindung legt die Geschäftsführung fest. Die Monatsziele deiner DIREKTEN Berater kannst du hier selbst setzen — sie erscheinen in deren Dashboard. Zeile aufklappen zeigt, wer unter dem Berater arbeitet."}
          </p>
          {berater.length > 0 ? (
            <StufeTable
              rows={berater}
              partnerKandidaten={partnerKandidaten}
              childMap={childMap}
              readOnly={!isGf}
              currentUserId={currentUserId}
            />
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
