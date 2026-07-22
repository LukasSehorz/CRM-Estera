"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { dokumentAnzeigename } from "@/lib/dokumente";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setDokumentFreigabe, setAlleFreigaben } from "./freigabe-actions";

type FreigabeDoc = { id: string; dateiname: string; kategorie: string };
type FinanziererOpt = { id: string; name: string };

export function FinanziererFreigabe({
  contactId,
  kundenName,
  docs,
  finanzierer,
  freigaben,
}: {
  contactId: string;
  kundenName: string;
  docs: FreigabeDoc[];
  finanzierer: FinanziererOpt[];
  /** documentId -> Liste der Finanzierer-IDs mit Freigabe. */
  freigaben: Record<string, string[]>;
}) {
  const [selected, setSelected] = useState<string>(finanzierer[0]?.id ?? "");
  // Lokaler Stand: documentId -> Set der Finanzierer-IDs.
  const [state, setState] = useState<Record<string, Set<string>>>(() => {
    const m: Record<string, Set<string>> = {};
    for (const d of docs) m[d.id] = new Set(freigaben[d.id] ?? []);
    return m;
  });
  const [pending, start] = useTransition();

  if (finanzierer.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Finanzierer-Freigabe
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Es ist noch kein Finanzierer angelegt. Lege in der Team-Verwaltung
          einen Zugang mit der Rolle &bdquo;Finanzierer&ldquo; an, um Dokumente
          freizuschalten.
        </p>
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          Finanzierer-Freigabe
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Für diesen Kunden sind noch keine Dokumente hochgeladen.
        </p>
      </div>
    );
  }

  const istFrei = (docId: string) => state[docId]?.has(selected) ?? false;
  const alleFrei = docs.every((d) => istFrei(d.id));

  function toggleDoc(docId: string, frei: boolean) {
    // Optimistisch
    setState((prev) => {
      const next = { ...prev };
      const set = new Set(next[docId]);
      if (frei) set.add(selected);
      else set.delete(selected);
      next[docId] = set;
      return next;
    });
    start(async () => {
      const res = await setDokumentFreigabe({
        documentId: docId,
        finanziererId: selected,
        frei,
        contactId,
        kundenName,
      });
      if ("error" in res) toast.error(res.error);
    });
  }

  function toggleAlle(frei: boolean) {
    setState((prev) => {
      const next = { ...prev };
      for (const d of docs) {
        const set = new Set(next[d.id]);
        if (frei) set.add(selected);
        else set.delete(selected);
        next[d.id] = set;
      }
      return next;
    });
    start(async () => {
      const res = await setAlleFreigaben({
        contactId,
        finanziererId: selected,
        documentIds: docs.map((d) => d.id),
        frei,
        kundenName,
      });
      if ("error" in res) toast.error(res.error);
      else
        toast.success(
          frei ? "Alle Dokumente freigegeben" : "Alle Freigaben entzogen",
        );
    });
  }

  const anzahl = docs.filter((d) => istFrei(d.id)).length;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Finanzierer-Freigabe
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Wähle einen Finanzierer und schalte einzelne Dokumente frei — oder
            alle auf einmal. Er sieht ausschließlich die freigegebenen Dokumente.
          </p>
        </div>
        <Select value={selected} onValueChange={setSelected}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Finanzierer wählen" />
          </SelectTrigger>
          <SelectContent>
            {finanzierer.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2 border-b border-border pb-2">
        <span className="text-xs text-muted-foreground">
          {anzahl} von {docs.length} freigegeben
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => toggleAlle(!alleFrei)}
        >
          {alleFrei ? "Alle entziehen" : "Alle freigeben"}
        </Button>
      </div>

      <ul className="mt-2 space-y-1">
        {docs.map((d) => (
          <li
            key={d.id}
            className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-surface-2"
          >
            <Checkbox
              checked={istFrei(d.id)}
              disabled={pending}
              onCheckedChange={(c) => toggleDoc(d.id, c === true)}
            />
            <span className="min-w-0 flex-1 truncate text-sm">
              {dokumentAnzeigename(d.kategorie, d.dateiname)}
              <span className="ml-1.5 text-xs text-muted-foreground">
                {d.dateiname}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
