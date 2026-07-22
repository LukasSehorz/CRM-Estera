"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { Checkbox } from "@/components/ui/checkbox";
import { toggleTask } from "@/app/(dashboard)/kontakte/actions";

export type FinTask = {
  id: string;
  titel: string;
  beschreibung: string | null;
  faellig_am: string | null;
  erledigt: boolean;
};

/** Aufgaben, die dem Finanzierer zugewiesen wurden (nur ansehen + abhaken). */
export function FinanziererAufgaben({ aufgaben }: { aufgaben: FinTask[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [offen, setOffen] = useState<string | null>(null);

  function onToggle(t: FinTask, checked: boolean) {
    start(async () => {
      const res = await toggleTask(t.id, checked);
      if ("error" in res) toast.error(res.error);
      else router.refresh();
    });
  }

  if (aufgaben.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
        <ClipboardList className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Aktuell sind Ihnen keine Aufgaben zugewiesen.
        </p>
      </div>
    );
  }

  const heute = new Date().toISOString().slice(0, 10);

  return (
    <ul className="space-y-2">
      {aufgaben.map((t) => {
        const ueberfaellig =
          !t.erledigt && t.faellig_am != null && t.faellig_am < heute;
        const auf = offen === t.id;
        return (
          <li
            key={t.id}
            className="rounded-xl border border-border bg-surface p-3"
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={t.erledigt}
                disabled={pending}
                onCheckedChange={(c) => onToggle(t, c === true)}
              />
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm",
                  t.erledigt && "text-muted-foreground line-through",
                )}
              >
                {t.titel}
              </span>
              {t.beschreibung && (
                <button
                  type="button"
                  onClick={() => setOffen((v) => (v === t.id ? null : t.id))}
                  aria-expanded={auf}
                  aria-label="Beschreibung anzeigen"
                  className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                >
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", auf && "rotate-180")}
                  />
                </button>
              )}
              {t.faellig_am && (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    ueberfaellig
                      ? "bg-danger/15 text-danger"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {formatDate(t.faellig_am)}
                </span>
              )}
            </div>
            {t.beschreibung && auf && (
              <p className="ml-8 mt-2 whitespace-pre-wrap rounded-md bg-surface-2/60 px-3 py-2 text-sm text-muted-foreground">
                {t.beschreibung}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
