"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { addTask, deleteTask, toggleTask } from "./actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";

export type TaskRow = {
  id: string;
  titel: string;
  faellig_am: string | null;
  erledigt: boolean;
};

/**
 * Aufgaben zum Kontakt (Schleife 2, 4.3 — Aktenteil). Sortierung:
 * überfällig → heute → später; Erledigtes ans Ende.
 */
export function ContactTasks({
  contactId,
  tasks,
}: {
  contactId: string;
  tasks: TaskRow[];
}) {
  const router = useRouter();
  const [titel, setTitel] = useState("");
  const [faellig, setFaellig] = useState("");
  const [pending, start] = useTransition();

  const heute = new Date().toISOString().slice(0, 10);
  const sorted = [...tasks].sort((a, b) => {
    if (a.erledigt !== b.erledigt) return a.erledigt ? 1 : -1;
    return (a.faellig_am ?? "9999") < (b.faellig_am ?? "9999") ? -1 : 1;
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!titel.trim()) return;
    start(async () => {
      const res = await addTask({
        titel,
        faellig_am: faellig || null,
        contact_id: contactId,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setTitel("");
      setFaellig("");
      router.refresh();
    });
  }

  function onToggle(t: TaskRow, checked: boolean) {
    start(async () => {
      const res = await toggleTask(t.id, checked, contactId);
      if ("error" in res) toast.error(res.error);
      else router.refresh();
    });
  }

  function onDelete(t: TaskRow) {
    start(async () => {
      const res = await deleteTask(t.id, contactId);
      if ("error" in res) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-base font-semibold">Aufgaben</h2>
      <p className="text-xs text-muted-foreground">
        To-Dos zu diesem Kunden — nach Fälligkeit sortiert.
      </p>

      <form onSubmit={submit} className="mt-3 flex items-center gap-2">
        <Input
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="Neue Aufgabe …"
        />
        <DateInput
          value={faellig}
          onChange={(e) => setFaellig(e.target.value)}
          className="w-40 shrink-0"
        />
        <Button type="submit" size="icon" disabled={pending || !titel.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      {sorted.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Keine Aufgaben. Lege die nächste To-Do an, damit nichts liegen bleibt.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {sorted.map((t) => {
            const ueberfaellig =
              !t.erledigt && t.faellig_am != null && t.faellig_am < heute;
            return (
              <li key={t.id} className="flex items-center gap-3 py-2 text-sm">
                <Checkbox
                  checked={t.erledigt}
                  disabled={pending}
                  onCheckedChange={(c) => onToggle(t, c === true)}
                />
                <span
                  className={cn(
                    "min-w-0 flex-1",
                    t.erledigt && "text-muted-foreground line-through",
                  )}
                >
                  {t.titel}
                </span>
                {t.faellig_am && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                      ueberfaellig
                        ? "bg-danger/15 text-danger"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {ueberfaellig ? "überfällig · " : ""}
                    {formatDate(t.faellig_am)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => onDelete(t)}
                  title="Aufgabe löschen"
                  className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-danger"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
