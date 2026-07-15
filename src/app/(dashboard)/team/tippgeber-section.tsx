"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Handshake, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createTippgeber, deleteTippgeber } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui/pill";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Bereich = "immobilien" | "vv";

export type TippgeberRow = {
  id: string;
  name: string;
  ownerId: string;
  ownerName: string;
  provisionSatz: string;
  bereiche: Bereich[];
};

type OwnerOption = { id: string; name: string };

const BEREICH_LABEL: Record<Bereich, string> = {
  immobilien: "Immobilien",
  vv: "VV",
};

/**
 * Tippgeber-Verwaltung (Struktur-Kern, F6): leichte Einträge ohne Login —
 * hängen unter einem Berater/der GF, mit individuellem Provisionssatz.
 * Anlegen + Liste an einem Ort (Team-Verwaltung).
 */
export function TippgeberSection({
  rows,
  ownerOptions,
}: {
  rows: TippgeberRow[];
  ownerOptions: OwnerOption[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [ownerId, setOwnerId] = useState(ownerOptions[0]?.id ?? "");
  const [satz, setSatz] = useState("10");
  const [bereiche, setBereiche] = useState<Bereich[]>(["immobilien"]);
  const [pending, start] = useTransition();

  function toggleBereich(b: Bereich) {
    setBereiche((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (bereiche.length === 0) {
      toast.error("Mindestens eine Sparte auswählen.");
      return;
    }
    start(async () => {
      const res = await createTippgeber({
        name,
        ownerId,
        provisionSatz: satz.trim() === "" ? null : Number(satz.replace(",", ".")),
        bereiche,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`Tippgeber ${name} angelegt`);
      setName("");
      setSatz("10");
      setBereiche(["immobilien"]);
      router.refresh();
    });
  }

  function remove(row: TippgeberRow) {
    if (!confirm(`Tippgeber „${row.name}" wirklich löschen?`)) return;
    start(async () => {
      const res = await deleteTippgeber(row.id);
      if ("error" in res) toast.error(res.error);
      else {
        toast.success("Tippgeber gelöscht");
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
          <Handshake className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold">Tippgeber</h2>
          <p className="text-xs text-muted-foreground">
            Empfehlungspartner ohne Login — hängen unter einem Berater, mit
            eigenem Provisionssatz.
          </p>
        </div>
      </div>

      {/* Anlegen */}
      <form
        onSubmit={submit}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tg-name">Name *</Label>
          <Input
            id="tg-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Yannick"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tg-owner">Zugehöriger Berater *</Label>
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectTrigger id="tg-owner">
              <SelectValue placeholder="Berater wählen" />
            </SelectTrigger>
            <SelectContent>
              {ownerOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tg-satz">Provisionssatz (%)</Label>
          <Input
            id="tg-satz"
            type="number"
            min={0}
            max={100}
            inputMode="decimal"
            value={satz}
            onChange={(e) => setSatz(e.target.value)}
            placeholder="z. B. 10"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Sparten *</Label>
          <div className="flex h-9 items-center gap-4">
            {(["immobilien", "vv"] as Bereich[]).map((b) => (
              <label
                key={b}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={bereiche.includes(b)}
                  onCheckedChange={() => toggleBereich(b)}
                />
                {BEREICH_LABEL[b]}
              </label>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Anlegen …" : "Tippgeber anlegen"}
          </Button>
        </div>
      </form>

      {/* Liste */}
      {rows.length > 0 && (
        <div className="mt-5 overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-2.5 font-medium">Tippgeber</th>
                <th className="px-4 py-2.5 font-medium">Berater</th>
                <th className="px-4 py-2.5 font-medium">Provision</th>
                <th className="px-4 py-2.5 font-medium">Sparten</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 font-medium">{r.name}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">
                    {r.ownerName}
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">
                    {r.provisionSatz ? `${r.provisionSatz} %` : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex gap-1.5">
                      {r.bereiche.map((b) => (
                        <Pill key={b} tone="accent">
                          {BEREICH_LABEL[b]}
                        </Pill>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Löschen"
                      className={cn("text-destructive hover:text-destructive")}
                      disabled={pending}
                      onClick={() => remove(r)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
