"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createBerater,
  setBeraterBereiche,
  setMonatsziele,
  setVertrieblerStufe,
} from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Pill } from "@/components/ui/pill";
import { Checkbox } from "@/components/ui/checkbox";

type Bereich = "immobilien" | "vv";

export type BeraterRow = {
  id: string;
  name: string;
  rolle: string;
  aktiv: boolean;
  stufe: string;
  bereiche: Bereich[];
  /** Monatsziele (eigene Provision) als Eingabe-Strings, "" = kein Ziel. */
  zielImmo: string;
  zielVv: string;
};

const BEREICH_LABEL: Record<Bereich, string> = {
  immobilien: "Immobilien",
  vv: "VV",
};

export function StufeTable({ rows }: { rows: BeraterRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[1000px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Rolle</th>
            <th className="px-4 py-3 font-medium">Sichtbare Sparten</th>
            <th className="px-4 py-3 font-medium">Vertriebler-Stufe (%)</th>
            <th className="px-4 py-3 font-medium">Monatsziel Immo (€)</th>
            <th className="px-4 py-3 font-medium">Monatsziel VV (€)</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <StufeRow key={r.id} row={r} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Eingabe-String → Zahl oder null ("" = kein Ziel). */
function parseZiel(s: string): number | null | undefined {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  if (Number.isNaN(n) || n < 0) return undefined; // ungültig
  return n;
}

function StufeRow({ row }: { row: BeraterRow }) {
  const [stufe, setStufe] = useState(row.stufe);
  const [bereiche, setBereiche] = useState<Bereich[]>(row.bereiche);
  const [zielImmo, setZielImmo] = useState(row.zielImmo);
  const [zielVv, setZielVv] = useState(row.zielVv);
  const [pending, start] = useTransition();
  const stufeDirty = stufe !== row.stufe;
  const zieleDirty = zielImmo !== row.zielImmo || zielVv !== row.zielVv;
  const dirty = stufeDirty || zieleDirty;
  const istGf = row.rolle === "geschaeftsfuehrung";

  function saveStufe() {
    start(async () => {
      if (stufeDirty) {
        const n = Number(stufe.replace(",", "."));
        if (Number.isNaN(n) || n < 0 || n > 100) {
          toast.error("Stufe muss zwischen 0 und 100 liegen.");
          return;
        }
        const res = await setVertrieblerStufe(row.id, n);
        if ("error" in res) {
          toast.error(res.error);
          return;
        }
      }
      if (zieleDirty) {
        const zi = parseZiel(zielImmo);
        const zv = parseZiel(zielVv);
        if (zi === undefined || zv === undefined) {
          toast.error("Monatsziel muss eine positive Zahl sein (oder leer).");
          return;
        }
        const res = await setMonatsziele(row.id, zi, zv);
        if ("error" in res) {
          toast.error(res.error);
          return;
        }
      }
      toast.success(`Änderungen für ${row.name} gespeichert`);
    });
  }

  function toggleBereich(b: Bereich) {
    const next = bereiche.includes(b)
      ? bereiche.filter((x) => x !== b)
      : [...bereiche, b];
    if (next.length === 0) {
      toast.error("Mindestens eine Sparte muss aktiv bleiben.");
      return;
    }
    const vorher = bereiche;
    setBereiche(next);
    start(async () => {
      const res = await setBeraterBereiche(row.id, next);
      if ("error" in res) {
        setBereiche(vorher);
        toast.error(res.error);
      } else {
        toast.success(`Sparten für ${row.name} gespeichert`);
      }
    });
  }

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 font-medium">
        {row.name}
        {!row.aktiv && (
          <span className="ml-2 text-xs text-muted-foreground">(inaktiv)</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Pill tone={istGf ? "accent" : "muted"}>
          {istGf ? "Geschäftsführung" : "Berater"}
        </Pill>
      </td>
      <td className="px-4 py-3">
        {istGf ? (
          <span className="text-xs text-muted-foreground">
            Immer beide Sparten
          </span>
        ) : (
          <div className="flex gap-1.5">
            {(["immobilien", "vv"] as Bereich[]).map((b) => {
              const aktivB = bereiche.includes(b);
              return (
                <button
                  key={b}
                  type="button"
                  disabled={pending}
                  onClick={() => toggleBereich(b)}
                  aria-pressed={aktivB}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                    aktivB
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {BEREICH_LABEL[b]}
                </button>
              );
            })}
          </div>
        )}
      </td>
      <td className="px-4 py-3">
        <Input
          type="number"
          min={0}
          max={100}
          inputMode="decimal"
          value={stufe}
          onChange={(e) => setStufe(e.target.value)}
          className="w-28"
        />
      </td>
      <td className="px-4 py-3">
        {bereiche.includes("immobilien") ? (
          <Input
            inputMode="decimal"
            placeholder="z. B. 10000"
            value={zielImmo}
            onChange={(e) => setZielImmo(e.target.value)}
            className="w-32 tabular-nums"
          />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        {bereiche.includes("vv") ? (
          <Input
            inputMode="decimal"
            placeholder="z. B. 5000"
            value={zielVv}
            onChange={(e) => setZielVv(e.target.value)}
            className="w-32 tabular-nums"
          />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <Button
          size="sm"
          variant={dirty ? "default" : "outline"}
          disabled={!dirty || pending}
          onClick={saveStufe}
        >
          {pending ? "Speichern …" : "Speichern"}
        </Button>
      </td>
    </tr>
  );
}

/** Berater direkt im CRM anlegen (Wunsch C) — inkl. Sparten & Stufe. */
export function NeuerBeraterForm() {
  const router = useRouter();
  const [v, setV] = useState({
    vorname: "",
    nachname: "",
    email: "",
    passwort: "",
    stufe: "30",
  });
  const [bereiche, setBereiche] = useState<Bereich[]>(["immobilien", "vv"]);
  const [pending, start] = useTransition();

  function set<K extends keyof typeof v>(key: K, value: string) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  function toggle(b: Bereich) {
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
      const res = await createBerater({
        vorname: v.vorname,
        nachname: v.nachname,
        email: v.email,
        passwort: v.passwort,
        stufe: Number(v.stufe.replace(",", ".")),
        bereiche,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(`Berater ${v.vorname} ${v.nachname} angelegt`);
      setV({ vorname: "", nachname: "", email: "", passwort: "", stufe: "30" });
      setBereiche(["immobilien", "vv"]);
      router.refresh();
    });
  }

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
            Zugang, Provisionsstufe und sichtbare Sparten in einem Schritt.
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nb-vorname">Vorname *</Label>
          <Input
            id="nb-vorname"
            required
            value={v.vorname}
            onChange={(e) => set("vorname", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nb-nachname">Nachname *</Label>
          <Input
            id="nb-nachname"
            required
            value={v.nachname}
            onChange={(e) => set("nachname", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nb-email">E-Mail (Login) *</Label>
          <Input
            id="nb-email"
            type="email"
            required
            value={v.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nb-passwort">Startpasswort * (min. 8 Zeichen)</Label>
          <Input
            id="nb-passwort"
            type="text"
            required
            minLength={8}
            value={v.passwort}
            onChange={(e) => set("passwort", e.target.value)}
            placeholder="Wird dem Berater mitgeteilt"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nb-stufe">Vertriebler-Stufe (%)</Label>
          <Input
            id="nb-stufe"
            type="number"
            min={0}
            max={100}
            inputMode="decimal"
            value={v.stufe}
            onChange={(e) => set("stufe", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Sichtbare Sparten *</Label>
          <div className="flex h-9 items-center gap-4">
            {(["immobilien", "vv"] as Bereich[]).map((b) => (
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
