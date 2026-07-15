"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Handshake, UserPlus } from "lucide-react";
import { createSubBerater, createTippgeber } from "../team/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type Bereich = "immobilien" | "vv";

function SpartenPicker({
  value,
  onToggle,
}: {
  value: Bereich[];
  onToggle: (b: Bereich) => void;
}) {
  return (
    <div className="flex h-9 items-center gap-4">
      {(["immobilien", "vv"] as Bereich[]).map((b) => (
        <label key={b} className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={value.includes(b)} onCheckedChange={() => onToggle(b)} />
          {b === "immobilien" ? "Immobilien" : "VV"}
        </label>
      ))}
    </div>
  );
}

/**
 * Berater bauen ihr eigenes Team auf (Call SJ F5/3.8): Tippgeber + Unter-
 * Berater — beide hängen automatisch unter dem angemeldeten Berater.
 */
export function TeamBuilder({ meId }: { meId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  // — Tippgeber —
  const [tgName, setTgName] = useState("");
  const [tgSatz, setTgSatz] = useState("10");
  const [tgBereiche, setTgBereiche] = useState<Bereich[]>(["immobilien"]);

  // — Unter-Berater —
  const [b, setB] = useState({
    vorname: "",
    nachname: "",
    email: "",
    passwort: "",
    stufe: "30",
    immoAnteil: "5",
  });
  const [bBereiche, setBBereiche] = useState<Bereich[]>(["immobilien", "vv"]);
  const setBF = (k: keyof typeof b, val: string) =>
    setB((prev) => ({ ...prev, [k]: val }));

  function submitTippgeber(e: React.FormEvent) {
    e.preventDefault();
    if (tgBereiche.length === 0) return toast.error("Mindestens eine Sparte.");
    start(async () => {
      const res = await createTippgeber({
        name: tgName,
        ownerId: meId,
        provisionSatz: tgSatz.trim() === "" ? null : Number(tgSatz.replace(",", ".")),
        bereiche: tgBereiche,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`Tippgeber ${tgName} angelegt`);
      setTgName("");
      setTgSatz("10");
      setTgBereiche(["immobilien"]);
      router.refresh();
    });
  }

  function submitBerater(e: React.FormEvent) {
    e.preventDefault();
    if (bBereiche.length === 0) return toast.error("Mindestens eine Sparte.");
    start(async () => {
      const res = await createSubBerater({
        vorname: b.vorname,
        nachname: b.nachname,
        email: b.email,
        passwort: b.passwort,
        stufe: Number(b.stufe.replace(",", ".")),
        immoAnteil: Number(b.immoAnteil.replace(",", ".")),
        bereiche: bBereiche,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`Berater ${b.vorname} ${b.nachname} angelegt`);
      setB({ vorname: "", nachname: "", email: "", passwort: "", stufe: "30", immoAnteil: "5" });
      setBBereiche(["immobilien", "vv"]);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Tippgeber */}
      <form
        onSubmit={submitTippgeber}
        className="rounded-xl border border-border bg-surface p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-amber-500/15 text-amber-600">
            <Handshake className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Tippgeber anlegen</h2>
            <p className="text-xs text-muted-foreground">
              Empfehlungspartner (ohne Login) unter dir.
            </p>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pt-name">Name *</Label>
            <Input id="pt-name" required value={tgName} onChange={(e) => setTgName(e.target.value)} placeholder="z. B. Yannick" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pt-satz">Provisionssatz (%)</Label>
            <Input id="pt-satz" type="number" min={0} max={100} inputMode="decimal" value={tgSatz} onChange={(e) => setTgSatz(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Sparten *</Label>
            <SpartenPicker
              value={tgBereiche}
              onToggle={(x) =>
                setTgBereiche((prev) => (prev.includes(x) ? prev.filter((y) => y !== x) : [...prev, x]))
              }
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={pending}>Tippgeber anlegen</Button>
        </div>
      </form>

      {/* Unter-Berater */}
      <form
        onSubmit={submitBerater}
        className="rounded-xl border border-border bg-surface p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
            <UserPlus className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Berater anlegen</h2>
            <p className="text-xs text-muted-foreground">
              Eigener Zugang, hängt unter dir.
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pb-vorname">Vorname *</Label>
            <Input id="pb-vorname" required value={b.vorname} onChange={(e) => setBF("vorname", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pb-nachname">Nachname *</Label>
            <Input id="pb-nachname" required value={b.nachname} onChange={(e) => setBF("nachname", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="pb-email">E-Mail (Login) *</Label>
            <Input id="pb-email" type="email" required value={b.email} onChange={(e) => setBF("email", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="pb-pw">Startpasswort * (min. 8)</Label>
            <Input id="pb-pw" type="text" required minLength={8} value={b.passwort} onChange={(e) => setBF("passwort", e.target.value)} placeholder="Wird dem Berater mitgeteilt" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pb-stufe">Stufe VV (%)</Label>
            <Input id="pb-stufe" type="number" min={0} max={100} inputMode="decimal" value={b.stufe} onChange={(e) => setBF("stufe", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pb-immo">Immo-Anteil — {b.immoAnteil} %</Label>
            <input id="pb-immo" type="range" min={1} max={10} step={0.5} value={b.immoAnteil} onChange={(e) => setBF("immoAnteil", e.target.value)} className="h-9 w-full cursor-pointer accent-primary" />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Sparten *</Label>
            <SpartenPicker
              value={bBereiche}
              onToggle={(x) =>
                setBBereiche((prev) => (prev.includes(x) ? prev.filter((y) => y !== x) : [...prev, x]))
              }
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="submit" disabled={pending}>Berater anlegen</Button>
        </div>
      </form>
    </div>
  );
}
