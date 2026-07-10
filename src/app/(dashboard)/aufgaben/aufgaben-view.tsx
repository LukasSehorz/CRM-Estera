"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { addTask, deleteTask, toggleTask } from "../kontakte/actions";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DateInput } from "@/components/ui/date-input";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AufgabeRow = {
  id: string;
  titel: string;
  faellig_am: string | null;
  erledigt: boolean;
  contact_id: string | null;
  deal_id: string | null;
  kontaktName: string | null;
  dealName: string | null;
};

const NONE = "__none";

type Gruppe = {
  key: string;
  label: string;
  tone?: "danger" | "warning";
  rows: AufgabeRow[];
};

/** Sortierung/Gruppierung nach Vorgabe: überfällig → heute → diese Woche → später. */
function gruppieren(rows: AufgabeRow[]): Gruppe[] {
  const heute = new Date().toISOString().slice(0, 10);
  const inSieben = new Date(Date.now() + 7 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const offen = rows.filter((r) => !r.erledigt);
  const gruppen: Gruppe[] = [
    {
      key: "ueberfaellig",
      label: "Überfällig",
      tone: "danger",
      rows: offen.filter((r) => r.faellig_am != null && r.faellig_am < heute),
    },
    {
      key: "heute",
      label: "Heute",
      tone: "warning",
      rows: offen.filter((r) => r.faellig_am === heute),
    },
    {
      key: "woche",
      label: "Diese Woche",
      rows: offen.filter(
        (r) =>
          r.faellig_am != null && r.faellig_am > heute && r.faellig_am <= inSieben,
      ),
    },
    {
      key: "spaeter",
      label: "Später",
      rows: offen.filter((r) => r.faellig_am != null && r.faellig_am > inSieben),
    },
    {
      key: "ohne",
      label: "Ohne Termin",
      rows: offen.filter((r) => r.faellig_am == null),
    },
    {
      key: "erledigt",
      label: "Erledigt",
      rows: rows.filter((r) => r.erledigt),
    },
  ];
  return gruppen.filter((g) => g.rows.length > 0);
}

export function AufgabenView({
  rows,
  kontaktOptionen,
  dealOptionen,
}: {
  rows: AufgabeRow[];
  kontaktOptionen: { id: string; name: string }[];
  dealOptionen: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [titel, setTitel] = useState("");
  const [faellig, setFaellig] = useState("");
  const [kontakt, setKontakt] = useState(NONE);
  const [deal, setDeal] = useState(NONE);
  const [pending, start] = useTransition();

  const gruppen = useMemo(() => gruppieren(rows), [rows]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!titel.trim()) return;
    start(async () => {
      const res = await addTask({
        titel,
        faellig_am: faellig || null,
        contact_id: kontakt === NONE ? null : kontakt,
        deal_id: deal === NONE ? null : deal,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setTitel("");
      setFaellig("");
      setKontakt(NONE);
      setDeal(NONE);
      toast.success("Aufgabe angelegt");
      router.refresh();
    });
  }

  function onToggle(r: AufgabeRow, checked: boolean) {
    start(async () => {
      const res = await toggleTask(r.id, checked, r.contact_id);
      if ("error" in res) toast.error(res.error);
      else router.refresh();
    });
  }

  function onDelete(r: AufgabeRow) {
    start(async () => {
      const res = await deleteTask(r.id, r.contact_id);
      if ("error" in res) toast.error(res.error);
      else router.refresh();
    });
  }

  const heute = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Neue Aufgabe: Zuordnung optional — auch frei notierbar (4.3) */}
      <form
        onSubmit={submit}
        className="rounded-xl border border-border bg-surface p-5"
      >
        <div className="grid gap-3 lg:grid-cols-[1fr_170px_220px_220px_auto]">
          <Input
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="Neue Aufgabe — was ist zu tun?"
          />
          <DateInput
            value={faellig}
            onChange={(e) => setFaellig(e.target.value)}
          />
          <Select value={kontakt} onValueChange={setKontakt}>
            <SelectTrigger>
              <SelectValue placeholder="Kontakt (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Ohne Kontakt</SelectItem>
              {kontaktOptionen.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={deal} onValueChange={setDeal}>
            <SelectTrigger>
              <SelectValue placeholder="Deal (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Ohne Deal</SelectItem>
              {dealOptionen.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" disabled={pending || !titel.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            Anlegen
          </Button>
        </div>
      </form>

      {gruppen.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface px-6 py-16 text-center">
          <h2 className="text-lg font-semibold">Keine Aufgaben</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Lege oben deine erste Aufgabe an — mit Fälligkeit bleibt nichts
            liegen.
          </p>
        </div>
      ) : (
        gruppen.map((g) => (
          <section key={g.key}>
            <h2
              className={cn(
                "mb-2 flex items-center gap-2 text-sm font-semibold",
                g.tone === "danger" && "text-danger",
                g.tone === "warning" && "text-warning",
              )}
            >
              {g.label}
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {g.rows.length}
              </span>
            </h2>
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface px-4">
              {g.rows.map((r) => {
                const ueberfaellig =
                  !r.erledigt && r.faellig_am != null && r.faellig_am < heute;
                return (
                  <li key={r.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <Checkbox
                      checked={r.erledigt}
                      disabled={pending}
                      onCheckedChange={(c) => onToggle(r, c === true)}
                    />
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate",
                        r.erledigt && "text-muted-foreground line-through",
                      )}
                    >
                      {r.titel}
                      {r.kontaktName && r.contact_id && (
                        <>
                          {" · "}
                          <Link
                            href={`/kontakte/${r.contact_id}`}
                            className="text-primary hover:underline"
                          >
                            {r.kontaktName}
                          </Link>
                        </>
                      )}
                      {r.dealName && r.deal_id && (
                        <>
                          {" · "}
                          <Link
                            href={`/deals/${r.deal_id}`}
                            className="text-primary hover:underline"
                          >
                            {r.dealName}
                          </Link>
                        </>
                      )}
                    </span>
                    {r.faellig_am && (
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium",
                          ueberfaellig
                            ? "bg-danger/15 text-danger"
                            : "bg-secondary text-muted-foreground",
                        )}
                      >
                        {formatDate(r.faellig_am)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => onDelete(r)}
                      title="Aufgabe löschen"
                      className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-danger"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
