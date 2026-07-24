"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { createSubBerater } from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type Bereich = "immobilien" | "vv";

/**
 * Berater-Self-Service (Call SJ 3.8/3.9): ein Berater legt eigene Berater an.
 * Der neue Berater hängt automatisch unter dem Aufrufer (Kaskade) — die
 * Server-Action setzt `parent_berater_id` selbst, das ist nicht wählbar.
 * Stufe/Anbindung bleiben danach GF-Hoheit (DB erzwingt das).
 */
export function NeuerSubBeraterForm({
  meineBereiche,
  maxProvision = 10,
  maxStufe = 100,
}: {
  meineBereiche: Bereich[];
  /** Obergrenze für den vergebbaren Provisionsanteil = eigener Satz (Call SJ). */
  maxProvision?: number;
  /** Obergrenze für die vergebbare VV-Stufe = eigene Stufe. */
  maxStufe?: number;
}) {
  const router = useRouter();
  const leer = {
    vorname: "",
    nachname: "",
    email: "",
    passwort: "",
    stufe: String(Math.min(30, maxStufe)),
    immoAnteil: String(Math.min(5, maxProvision)),
  };
  const [v, setV] = useState(leer);
  const [bereiche, setBereiche] = useState<Bereich[]>(meineBereiche);
  const [pending, start] = useTransition();

  function set<K extends keyof typeof v>(key: K, value: string) {
    setV((prev) => ({ ...prev, [key]: value }));
  }
  function toggle(b: Bereich) {
    setBereiche((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b],
    );
  }

  const kannImmo = maxProvision >= 1;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (bereiche.length === 0) {
      toast.error("Mindestens eine Sparte auswählen.");
      return;
    }
    if (bereiche.includes("immobilien") && !kannImmo) {
      toast.error(
        "Für dich ist kein Provisionsanteil hinterlegt — bitte von der Geschäftsführung setzen lassen, bevor du Immobilien-Berater anlegst.",
      );
      return;
    }
    start(async () => {
      const res = await createSubBerater({
        vorname: v.vorname,
        nachname: v.nachname,
        email: v.email,
        passwort: v.passwort,
        stufe: Number(v.stufe.replace(",", ".")),
        immoAnteil: Number(v.immoAnteil.replace(",", ".")),
        bereiche,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`Berater ${v.vorname} ${v.nachname} angelegt`);
      setV(leer);
      setBereiche(meineBereiche);
      router.refresh();
    });
  }

  const zeigeImmo = bereiche.includes("immobilien");

  return (
    <form
      onSubmit={submit}
      className="rounded-xl border border-border bg-surface p-5"
    >
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
          <UserPlus className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold">Neuen Berater anlegen</h2>
          <p className="text-xs text-muted-foreground">
            Der neue Berater hängt automatisch unter dir — du verdienst an
            seinen Abschlüssen mit.
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sb-vorname">Vorname *</Label>
          <Input
            id="sb-vorname"
            required
            value={v.vorname}
            onChange={(e) => set("vorname", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sb-nachname">Nachname *</Label>
          <Input
            id="sb-nachname"
            required
            value={v.nachname}
            onChange={(e) => set("nachname", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sb-email">E-Mail (Login) *</Label>
          <Input
            id="sb-email"
            type="email"
            required
            value={v.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sb-passwort">Startpasswort * (min. 8 Zeichen)</Label>
          <Input
            id="sb-passwort"
            type="text"
            required
            minLength={8}
            value={v.passwort}
            onChange={(e) => set("passwort", e.target.value)}
            placeholder="Wird dem Berater mitgeteilt"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sb-stufe">Vertriebler-Stufe (%) — VV</Label>
          <Input
            id="sb-stufe"
            type="number"
            min={0}
            max={maxStufe}
            inputMode="decimal"
            value={v.stufe}
            onChange={(e) => set("stufe", e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Max. {maxStufe} % (deine eigene Stufe) · deine Differenz dazu ist dein
            Overhead.
          </p>
        </div>
        {zeigeImmo &&
          (kannImmo ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sb-immo">Provisionsanteil — {v.immoAnteil} %</Label>
              <input
                id="sb-immo"
                type="range"
                min={1}
                max={maxProvision}
                step={0.5}
                value={v.immoAnteil}
                onChange={(e) => set("immoAnteil", e.target.value)}
                className="h-9 w-full cursor-pointer accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                Regler 1–{maxProvision} % (max. dein eigener Satz) · Anteil vom
                Kaufpreis bei Immobilien-Deals.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label>Provisionsanteil</Label>
              <p className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
                Für dich ist noch kein eigener Provisionsanteil hinterlegt. Die
                Geschäftsführung muss dir zuerst einen Satz zuweisen, bevor du
                Immobilien-Berater anlegen kannst.
              </p>
            </div>
          ))}
        <div className="flex flex-col gap-1.5">
          <Label>Sichtbare Sparten *</Label>
          <div className="flex h-9 items-center gap-4">
            {meineBereiche.map((b) => (
              <label
                key={b}
                className="flex cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={bereiche.includes(b)}
                  onCheckedChange={() => toggle(b)}
                />
                {b === "immobilien" ? "Immobilien" : "Vermögensverwaltung"}
              </label>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Nur deine eigenen Sparten sind wählbar.
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Anlegen …" : "Berater anlegen"}
        </Button>
      </div>
    </form>
  );
}
