"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp } from "lucide-react";
import { formatEUR } from "@/lib/format";
import {
  Pill,
  kontaktStatusTone,
  terminStatusTone,
} from "@/components/ui/pill";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BEREICH, KONTAKT_STATUS, bereichLabel } from "@/config/enums";

export type ContactRow = {
  id: string;
  vorname: string;
  nachname: string;
  email: string | null;
  telefon: string | null;
  status: string;
  termin_status: string;
  leadquelle: string | null;
  interesse: string[];
  finanzierungsrahmen_betrag: number | null;
  eingeschaetzter_betrag?: number | null;
  berater_id: string;
  created_at: string;
};

const ALL = "__all";
type SortKey = "name" | "status" | "created_at" | "volumen";

export function ContactsTable({
  contacts,
  beraterMap,
  isGf,
  showVolumen = false,
}: {
  contacts: ContactRow[];
  beraterMap: Record<string, string>;
  isGf: boolean;
  showVolumen?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState(ALL);
  const [interesse, setInteresse] = useState(ALL);
  const [sortKey, setSortKey] = useState<SortKey>(
    showVolumen ? "volumen" : "created_at",
  );
  const [sortAsc, setSortAsc] = useState(false);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortAsc((a) => !a);
    else {
      setSortKey(key);
      setSortAsc(key === "name");
    }
  }

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = contacts.filter((c) => {
      if (status !== ALL && c.status !== status) return false;
      if (interesse !== ALL && !c.interesse.includes(interesse)) return false;
      if (needle) {
        const hay =
          `${c.vorname} ${c.nachname} ${c.email ?? ""} ${c.telefon ?? ""}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name")
        cmp = `${a.nachname} ${a.vorname}`.localeCompare(
          `${b.nachname} ${b.vorname}`,
          "de",
        );
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status, "de");
      else if (sortKey === "volumen")
        cmp = (a.eingeschaetzter_betrag ?? 0) - (b.eingeschaetzter_betrag ?? 0);
      else cmp = a.created_at.localeCompare(b.created_at);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [contacts, q, status, interesse, sortKey, sortAsc]);

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey === k ? (
      sortAsc ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : (
        <ArrowDown className="h-3.5 w-3.5" />
      )
    ) : null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Nach Name, E-Mail oder Telefon suchen …"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Alle Status</SelectItem>
            {KONTAKT_STATUS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={interesse} onValueChange={setInteresse}>
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Interesse" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Alle Bereiche</SelectItem>
            {BEREICH.map((b) => (
              <SelectItem key={b.value} value={b.value}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground sm:ml-auto">
          {rows.length} {rows.length === 1 ? "Kontakt" : "Kontakte"}
        </span>
      </div>

      {/* Tabelle */}
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="px-4 py-3 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort("name")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Name <SortIcon k="name" />
                </button>
              </th>
              <th className="px-4 py-3 font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort("status")}
                  className="inline-flex items-center gap-1 hover:text-foreground"
                >
                  Status <SortIcon k="status" />
                </button>
              </th>
              <th className="px-4 py-3 font-medium">Termin</th>
              <th className="px-4 py-3 font-medium">Interesse</th>
              <th className="px-4 py-3 font-medium">Leadquelle</th>
              <th className="px-4 py-3 font-medium">Rahmen</th>
              {showVolumen && (
                <th className="px-4 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => toggleSort("volumen")}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Volumen <SortIcon k="volumen" />
                  </button>
                </th>
              )}
              {isGf && <th className="px-4 py-3 font-medium">Berater</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={(isGf ? 7 : 6) + (showVolumen ? 1 : 0)}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Keine Treffer. Passe Suche oder Filter an.
                </td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/kontakte/${c.id}`)}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-surface-2"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">
                      {c.vorname} {c.nachname}
                    </div>
                    {c.email && (
                      <div className="text-xs text-muted-foreground">
                        {c.email}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={kontaktStatusTone(c.status)}>{c.status}</Pill>
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={terminStatusTone(c.termin_status)}>
                      {c.termin_status}
                    </Pill>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {c.interesse.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        c.interesse.map((b) => (
                          <Pill key={b} tone="accent">
                            {bereichLabel(b)}
                          </Pill>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.leadquelle ?? "—"}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {formatEUR(c.finanzierungsrahmen_betrag)}
                  </td>
                  {showVolumen && (
                    <td className="px-4 py-3 tabular-nums font-medium text-foreground">
                      {formatEUR(c.eingeschaetzter_betrag)}
                    </td>
                  )}
                  {isGf && (
                    <td className="px-4 py-3 text-muted-foreground">
                      {beraterMap[c.berater_id] ?? "—"}
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
