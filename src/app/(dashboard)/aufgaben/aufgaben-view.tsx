"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, Plus, Trash2, UserCheck } from "lucide-react";
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
  beschreibung: string | null;
  faellig_am: string | null;
  erledigt: boolean;
  contact_id: string | null;
  deal_id: string | null;
  kontaktName: string | null;
  dealName: string | null;
  ownerId: string;
  assignedTo: string | null;
  assignedName: string | null;
  ownerName: string | null;
};

type DealOption = { id: string; name: string; contactId: string | null };

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
  currentUserId,
  kontaktOptionen,
  dealOptionen,
  beraterOptionen = [],
}: {
  rows: AufgabeRow[];
  currentUserId: string;
  kontaktOptionen: { id: string; name: string }[];
  dealOptionen: DealOption[];
  /** Zuweisbare Personen (Downline bzw. alle für GF). */
  beraterOptionen?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [faellig, setFaellig] = useState("");
  const [kontakt, setKontakt] = useState(NONE);
  const [deal, setDeal] = useState(NONE);
  const [zuweisung, setZuweisung] = useState(NONE);
  const [pending, start] = useTransition();
  const [openInfo, setOpenInfo] = useState<string | null>(null);

  // Deal + Kunde gehören zusammen (Kunden-Feedback): erst Kunde wählen, dann
  // stehen nur DESSEN Deals zur Auswahl — so kann kein fremder Deal an einen
  // anderen Kunden gehängt werden.
  const passendeDeals =
    kontakt === NONE
      ? []
      : dealOptionen.filter((d) => d.contactId === kontakt);
  function setKontaktUndReset(val: string) {
    setKontakt(val);
    // Deal zurücksetzen, wenn er nicht zum neuen Kunden gehört.
    if (deal !== NONE && !dealOptionen.some((d) => d.id === deal && d.contactId === val)) {
      setDeal(NONE);
    }
  }
  // Auf-/zuklappbare Gruppen — „Erledigt" startet eingeklappt (Wunsch Lukas).
  const [zu, setZu] = useState<Record<string, boolean>>({ erledigt: true });
  const toggleGruppe = (key: string) =>
    setZu((prev) => ({ ...prev, [key]: !prev[key] }));

  const gruppen = useMemo(() => gruppieren(rows), [rows]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!titel.trim()) return;
    start(async () => {
      const res = await addTask({
        titel,
        beschreibung: beschreibung || null,
        faellig_am: faellig || null,
        contact_id: kontakt === NONE ? null : kontakt,
        deal_id: deal === NONE ? null : deal,
        assigned_to: zuweisung === NONE ? null : zuweisung,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setTitel("");
      setBeschreibung("");
      setFaellig("");
      setKontakt(NONE);
      setDeal(NONE);
      setZuweisung(NONE);
      toast.success(
        zuweisung === NONE ? "Aufgabe angelegt" : "Aufgabe zugewiesen",
      );
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
        <div
          className={cn(
            "grid gap-3",
            beraterOptionen.length > 0
              ? "lg:grid-cols-[1fr_150px_190px_190px_200px_auto]"
              : "lg:grid-cols-[1fr_170px_220px_220px_auto]",
          )}
        >
          <Input
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="Neue Aufgabe — was ist zu tun?"
          />
          <DateInput
            value={faellig}
            onChange={(e) => setFaellig(e.target.value)}
          />
          <Select value={kontakt} onValueChange={setKontaktUndReset}>
            <SelectTrigger className="w-full min-w-0">
              <SelectValue placeholder="Kunde (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Ohne Kunden</SelectItem>
              {kontaktOptionen.map((k) => (
                <SelectItem key={k.id} value={k.id}>
                  {k.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Deal gehört zum gewählten Kunden — erst Kunde wählen. */}
          <Select
            value={deal}
            onValueChange={setDeal}
            disabled={kontakt === NONE}
          >
            <SelectTrigger className="w-full min-w-0">
              <SelectValue
                placeholder={
                  kontakt === NONE ? "Erst Kunde wählen" : "Deal (optional)"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Ohne Deal</SelectItem>
              {passendeDeals.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Zuweisen (Kunden-Feedback): an einen Berater; Standard = mir selbst. */}
          {beraterOptionen.length > 0 && (
            <Select value={zuweisung} onValueChange={setZuweisung}>
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder="Zuweisen an" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Mir selbst</SelectItem>
                {beraterOptionen.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button type="submit" disabled={pending || !titel.trim()}>
            <Plus className="mr-1 h-4 w-4" />
            {zuweisung === NONE ? "Anlegen" : "Zuweisen"}
          </Button>
        </div>
        {/* Beschreibung (Kunden-Feedback): Details zur Tätigkeit, in der Liste
            per Dropdown sichtbar. */}
        <textarea
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          placeholder="Beschreibung (optional) — Details zur Tätigkeit"
          rows={2}
          className="mt-3 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        />
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
        gruppen.map((g) => {
          const eingeklappt = zu[g.key] ?? false;
          return (
          <section key={g.key}>
            <button
              type="button"
              onClick={() => toggleGruppe(g.key)}
              aria-expanded={!eingeklappt}
              className={cn(
                "mb-2 flex w-full items-center gap-2 text-sm font-semibold",
                g.tone === "danger" && "text-danger",
                g.tone === "warning" && "text-warning",
              )}
            >
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  eingeklappt && "-rotate-90",
                )}
                aria-hidden
              />
              {g.label}
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                {g.rows.length}
              </span>
            </button>
            {!eingeklappt && (
            <ul className="divide-y divide-border rounded-xl border border-border bg-surface px-4">
              {g.rows.map((r) => {
                const ueberfaellig =
                  !r.erledigt && r.faellig_am != null && r.faellig_am < heute;
                return (
                  <li key={r.id} className="py-2.5 text-sm">
                    <div className="flex items-center gap-3">
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
                    {/* Beschreibung per Dropdown ein-/ausklappen. */}
                    {r.beschreibung && (
                      <button
                        type="button"
                        onClick={() =>
                          setOpenInfo((v) => (v === r.id ? null : r.id))
                        }
                        aria-expanded={openInfo === r.id}
                        aria-label="Beschreibung anzeigen"
                        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                      >
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            openInfo === r.id && "rotate-180",
                          )}
                        />
                      </button>
                    )}
                    {(() => {
                      const delegiert =
                        r.assignedTo != null && r.assignedTo !== r.ownerId;
                      if (!delegiert) return null;
                      const label =
                        currentUserId === r.ownerId
                          ? `an ${r.assignedName ?? "—"}`
                          : currentUserId === r.assignedTo
                            ? `von ${r.ownerName ?? "—"}`
                            : `${r.ownerName ?? "—"} → ${r.assignedName ?? "—"}`;
                      return (
                        <span
                          title="Zuweisung"
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-info/10 px-2 py-0.5 text-[11px] font-medium text-info"
                        >
                          <UserCheck className="h-3 w-3" aria-hidden />
                          {label}
                        </span>
                      );
                    })()}
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
                    </div>
                    {r.beschreibung && openInfo === r.id && (
                      <p className="ml-8 mt-1.5 whitespace-pre-wrap rounded-md bg-surface-2/60 px-3 py-2 text-xs text-muted-foreground">
                        {r.beschreibung}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
            )}
          </section>
          );
        })
      )}
    </div>
  );
}
