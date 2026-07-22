"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
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
import {
  setDokumentFreigabe,
  setAlleFreigaben,
} from "../kontakte/freigabe-actions";

export type FinDoc = {
  id: string;
  dateiname: string;
  anzeigename: string | null;
  kategorie: string;
};
export type FinKunde = { contactId: string; name: string; docs: FinDoc[] };
export type FinOpt = { id: string; name: string };

/**
 * Finanzierer-Zugriffsverwaltung (Kunden-Feedback 22.07.): die GF wählt einen
 * Finanzierer und schaltet je Kunde einzelne Dokumente ODER alle auf einmal
 * frei. Der Finanzierer sieht dann genau diese Dokumente (+ den Kundennamen).
 */
export function FinanziererVerwaltung({
  finanzierer,
  kunden,
  freigaben,
}: {
  finanzierer: FinOpt[];
  kunden: FinKunde[];
  /** finanziererId -> Liste freigegebener documentIds. */
  freigaben: Record<string, string[]>;
}) {
  const [selected, setSelected] = useState(finanzierer[0]?.id ?? "");
  const [state, setState] = useState<Record<string, Set<string>>>(() => {
    const m: Record<string, Set<string>> = {};
    for (const f of finanzierer) m[f.id] = new Set(freigaben[f.id] ?? []);
    return m;
  });
  const [offen, setOffen] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (finanzierer.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-center text-sm text-muted-foreground">
        Noch kein Finanzierer angelegt. Lege oben einen Zugang mit der Rolle
        &bdquo;Finanzierer&ldquo; an — danach kannst du hier Kunden &amp;
        Dokumente freischalten.
      </div>
    );
  }

  const istFrei = (docId: string) => state[selected]?.has(docId) ?? false;
  const kundenName = (id: string) =>
    kunden.find((k) => k.contactId === id)?.name ?? "Kunde";

  function apply(next: Set<string>) {
    setState((prev) => ({ ...prev, [selected]: next }));
  }

  function toggleDoc(k: FinKunde, docId: string, frei: boolean) {
    const next = new Set(state[selected]);
    if (frei) next.add(docId);
    else next.delete(docId);
    apply(next);
    start(async () => {
      const res = await setDokumentFreigabe({
        documentId: docId,
        finanziererId: selected,
        frei,
        contactId: k.contactId,
        kundenName: k.name,
      });
      if ("error" in res) toast.error(res.error);
    });
  }

  function toggleKunde(k: FinKunde, frei: boolean) {
    const next = new Set(state[selected]);
    for (const d of k.docs) {
      if (frei) next.add(d.id);
      else next.delete(d.id);
    }
    apply(next);
    start(async () => {
      const res = await setAlleFreigaben({
        contactId: k.contactId,
        finanziererId: selected,
        documentIds: k.docs.map((d) => d.id),
        frei,
        kundenName: k.name,
      });
      if ("error" in res) toast.error(res.error);
      else
        toast.success(
          frei
            ? `Alle Dokumente von ${k.name} freigegeben`
            : `Freigaben von ${k.name} entzogen`,
        );
    });
  }

  const gesamtFrei = kunden.reduce(
    (n, k) => n + k.docs.filter((d) => istFrei(d.id)).length,
    0,
  );

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            Finanzierer-Zugriff verwalten
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Wähle einen Finanzierer und schalte Kunden bzw. einzelne Dokumente
            frei. Er sieht ausschließlich die freigegebenen Dokumente.
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

      {kunden.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Es sind noch keine Kundendokumente vorhanden, die freigeschaltet werden
          könnten.
        </p>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {gesamtFrei} Dokument{gesamtFrei === 1 ? "" : "e"} für{" "}
            {finanzierer.find((f) => f.id === selected)?.name} freigegeben.
          </p>
          <ul className="space-y-1">
            {kunden.map((k) => {
              const auf = offen === k.contactId;
              const alle = k.docs.every((d) => istFrei(d.id));
              const anzahl = k.docs.filter((d) => istFrei(d.id)).length;
              return (
                <li
                  key={k.contactId}
                  className="overflow-hidden rounded-lg border border-border"
                >
                  <div className="flex items-center gap-2 bg-surface-2/40 px-3 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        setOffen((v) => (v === k.contactId ? null : k.contactId))
                      }
                      aria-expanded={auf}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm font-medium"
                    >
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                          !auf && "-rotate-90",
                        )}
                      />
                      <span className="truncate">{k.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {anzahl}/{k.docs.length}
                      </span>
                    </button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => toggleKunde(k, !alle)}
                    >
                      {alle ? "Alle entziehen" : "Alle freigeben"}
                    </Button>
                  </div>
                  {auf && (
                    <ul className="space-y-1 px-3 py-2">
                      {k.docs.map((d) => (
                        <li
                          key={d.id}
                          className="flex items-center gap-3 rounded-md px-1 py-1 text-sm hover:bg-surface-2"
                        >
                          <Checkbox
                            checked={istFrei(d.id)}
                            disabled={pending}
                            onCheckedChange={(c) => toggleDoc(k, d.id, c === true)}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {d.anzeigename ||
                              dokumentAnzeigename(d.kategorie, d.dateiname)}
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              {d.dateiname}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="text-[11px] text-muted-foreground">
            Tipp: {kundenName(kunden[0]?.contactId ?? "")} &amp; Co. lassen sich
            auch direkt in der jeweiligen Kundenakte freigeben.
          </p>
        </>
      )}
    </div>
  );
}
