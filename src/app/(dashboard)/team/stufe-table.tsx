"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowUpRight, ChevronRight, Handshake, User, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createBerater,
  setBeraterAnbindung,
  setBeraterBereiche,
  setMonatsziele,
  setRolle,
  setVertrieblerStufe,
} from "./actions";
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

export type BeraterRow = {
  id: string;
  name: string;
  rolle: string;
  aktiv: boolean;
  stufe: string;
  bereiche: Bereich[];
  /** Anbindung (1.5/8): Immo-Anteil-Default (%) + übergeordneter Partner. */
  immoDefault: string;
  parentId: string;
  /** Monatsziele (eigene Provision) als Eingabe-Strings, "" = kein Ziel. */
  zielImmo: string;
  zielVv: string;
};

type PartnerOption = { id: string; name: string };
const KEIN_PARTNER = "__none";

export type DownlineChild = {
  berater: { id: string; name: string; stufe: string }[];
  tippgeber: { id: string; name: string; satz: string }[];
};

const BEREICH_LABEL: Record<Bereich, string> = {
  immobilien: "Immobilien",
  vv: "VV",
};

const COL_COUNT = 9;

export function StufeTable({
  rows,
  partnerKandidaten,
  childMap = {},
  readOnly = false,
  currentUserId,
}: {
  rows: BeraterRow[];
  partnerKandidaten: PartnerOption[];
  /** Downline je Berater (2.8) — für das Aufklappen der Struktur. */
  childMap?: Record<string, DownlineChild>;
  /** Berater-Sicht (3.9): nur lesen — Stufe/Anbindung sind GF-Hoheit. */
  readOnly?: boolean;
  /** Eigene ID: ein Berater darf die ZIELE seiner DIREKTEN Berater setzen
   *  (Kunden-Feedback 22.07.), auch wenn die restliche Zeile readOnly ist. */
  currentUserId?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full min-w-[1280px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Rolle</th>
            <th className="px-4 py-3 font-medium">Sichtbare Sparten</th>
            <th className="px-4 py-3 font-medium">Stufe VV (%)</th>
            <th className="px-4 py-3 font-medium">Provisionsanteil (%)</th>
            <th className="px-4 py-3 font-medium">Übergeordneter Partner</th>
            <th className="px-4 py-3 font-medium">Ziel Immo (€)</th>
            <th className="px-4 py-3 font-medium">Ziel VV (€)</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <StufeRow
              key={r.id}
              row={r}
              partnerKandidaten={partnerKandidaten.filter((p) => p.id !== r.id)}
              downline={childMap[r.id]}
              readOnly={readOnly}
              zielEditable={!readOnly || (!!currentUserId && r.parentId === currentUserId)}
            />
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

function StufeRow({
  row,
  partnerKandidaten,
  downline,
  readOnly = false,
  zielEditable = false,
}: {
  row: BeraterRow;
  partnerKandidaten: PartnerOption[];
  downline?: DownlineChild;
  readOnly?: boolean;
  /** Dürfen die Ziel-Felder dieser Zeile bearbeitet werden? */
  zielEditable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [stufe, setStufe] = useState(row.stufe);
  const [bereiche, setBereiche] = useState<Bereich[]>(row.bereiche);
  const [immoDefault, setImmoDefault] = useState(row.immoDefault);
  const [parentId, setParentId] = useState(row.parentId);
  const [zielImmo, setZielImmo] = useState(row.zielImmo);
  const [zielVv, setZielVv] = useState(row.zielVv);
  const [pending, start] = useTransition();
  const stufeDirty = stufe !== row.stufe;
  const anbindungDirty =
    immoDefault !== row.immoDefault || parentId !== row.parentId;
  const zieleDirty = zielImmo !== row.zielImmo || zielVv !== row.zielVv;
  const dirty = stufeDirty || anbindungDirty || zieleDirty;
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
      if (anbindungDirty) {
        const immo = immoDefault.trim() === "" ? null : Number(immoDefault.replace(",", "."));
        if (immo != null && (Number.isNaN(immo) || immo < 0 || immo > 100)) {
          toast.error("Provisionsanteil muss zwischen 0 und 100 liegen (oder leer).");
          return;
        }
        const res = await setBeraterAnbindung(
          row.id,
          immo,
          parentId === "" ? null : parentId,
        );
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

  const anzahlDownline =
    (downline?.berater.length ?? 0) + (downline?.tippgeber.length ?? 0);
  const hatDownline = anzahlDownline > 0;

  return (
    <>
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 font-medium">
        <div className="flex items-center gap-1.5">
          {/* Aufklappen: wer arbeitet unter diesem Berater? (2.8) */}
          {hatDownline ? (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Zuklappen" : "Downline anzeigen"}
              aria-expanded={open}
              className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              <ChevronRight
                className={cn("h-4 w-4 transition-transform", open && "rotate-90")}
              />
            </button>
          ) : (
            <span className="inline-block w-5" />
          )}
          {/* Name -> Berater-Akte — die Drilldown-Route ist GF-only, daher
              in der Berater-Sicht (readOnly) kein Link (kein toter Klick). */}
          {readOnly ? (
            <span>{row.name}</span>
          ) : (
            <Link
              href={`/dashboard/berater/${row.id}`}
              className="group inline-flex items-center gap-1 hover:text-primary hover:underline"
            >
              {row.name}
              <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          )}
          {!row.aktiv && (
            <span className="ml-1 text-xs text-muted-foreground">(inaktiv)</span>
          )}
          {hatDownline && (
            <span className="ml-1 rounded-full bg-surface-2 px-1.5 text-[10px] font-medium tabular-nums text-muted-foreground">
              {anzahlDownline}
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {istGf ? (
          <Pill tone="accent">Geschäftsführung</Pill>
        ) : (
          <Select
            disabled={readOnly}
            value={row.rolle}
            onValueChange={(val) => {
              if (val === row.rolle) return;
              start(async () => {
                const res = await setRolle(row.id, val as "berater" | "backoffice");
                if ("error" in res) toast.error(res.error);
                else toast.success(`Rolle für ${row.name} geändert`);
              });
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="berater">Berater</SelectItem>
              <SelectItem value="backoffice">Backoffice</SelectItem>
            </SelectContent>
          </Select>
        )}
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
                  disabled={pending || readOnly}
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
          disabled={readOnly}
          value={stufe}
          onChange={(e) => setStufe(e.target.value)}
          className="w-24"
        />
      </td>
      {/* Immo-Anteil-Default (1.5): vorbefüllt in neue Immo-Deals */}
      <td className="px-4 py-3">
        {istGf ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : bereiche.includes("immobilien") ? (
          <Input
            type="number"
            min={0}
            max={100}
            inputMode="decimal"
            placeholder="z. B. 5"
            disabled={readOnly}
            value={immoDefault}
            onChange={(e) => setImmoDefault(e.target.value)}
            className="w-24"
          />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      {/* Übergeordneter Partner (8): Upline für Overhead */}
      <td className="px-4 py-3">
        {istGf ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <Select
            disabled={readOnly}
            value={parentId === "" ? KEIN_PARTNER : parentId}
            onValueChange={(val) =>
              setParentId(val === KEIN_PARTNER ? "" : val)
            }
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Kein Partner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={KEIN_PARTNER}>Kein Partner</SelectItem>
              {partnerKandidaten.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </td>
      <td className="px-4 py-3">
        {bereiche.includes("immobilien") ? (
          <Input
            inputMode="decimal"
            placeholder="z. B. 10000"
            disabled={!zielEditable}
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
            disabled={!zielEditable}
            value={zielVv}
            onChange={(e) => setZielVv(e.target.value)}
            className="w-32 tabular-nums"
          />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {(!readOnly || zielEditable) && (
          <Button
            size="sm"
            variant={dirty ? "default" : "outline"}
            disabled={!dirty || pending}
            onClick={saveStufe}
          >
            {pending ? "Speichern …" : "Speichern"}
          </Button>
        )}
      </td>
    </tr>
    {open && hatDownline && (
      <tr className="border-b border-border bg-surface-2/40">
        <td colSpan={COL_COUNT} className="px-4 py-3">
          <div className="ml-6 flex flex-wrap gap-2">
            {downline!.berater.map((b) => {
              const inhalt = (
                <>
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-amber-500/15 text-amber-600">
                    <User className="h-3 w-3" />
                  </span>
                  {b.name}
                  <span className="text-muted-foreground">
                    · Stufe {b.stufe || "—"} %
                  </span>
                </>
              );
              // Drilldown ist GF-only — Berater-Sicht ohne toten Link.
              return readOnly ? (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium"
                >
                  {inhalt}
                </span>
              ) : (
                <Link
                  key={b.id}
                  href={`/dashboard/berater/${b.id}`}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-primary hover:text-primary"
                >
                  {inhalt}
                </Link>
              );
            })}
            {downline!.tippgeber.map((t) => (
              <span
                key={t.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-muted-foreground"
              >
                <span className="grid h-5 w-5 place-items-center rounded-full border border-border">
                  <Handshake className="h-3 w-3" />
                </span>
                {t.name}
                <span>· Tippgeber{t.satz ? ` ${t.satz} %` : ""}</span>
              </span>
            ))}
          </div>
        </td>
      </tr>
    )}
    </>
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
    immoAnteil: "5",
  });
  const [bereiche, setBereiche] = useState<Bereich[]>(["immobilien", "vv"]);
  const [rolle, setRolleState] = useState<"berater" | "backoffice">("berater");
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
        immoAnteil: Number(v.immoAnteil.replace(",", ".")),
        bereiche,
        rolle,
      });
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success(
        `${rolle === "backoffice" ? "Backoffice" : "Berater"} ${v.vorname} ${v.nachname} angelegt`,
      );
      setV({
        vorname: "",
        nachname: "",
        email: "",
        passwort: "",
        stufe: "30",
        immoAnteil: "5",
      });
      setBereiche(["immobilien", "vv"]);
      setRolleState("berater");
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
          <Label htmlFor="nb-rolle">Rolle</Label>
          <Select
            value={rolle}
            onValueChange={(val) => setRolleState(val as "berater" | "backoffice")}
          >
            <SelectTrigger id="nb-rolle">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="berater">Berater</SelectItem>
              <SelectItem value="backoffice">Backoffice (ohne Provision)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nb-stufe">Vertriebler-Stufe (%) — VV</Label>
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
        {/* Immo-Anteil-Regler 1–10 (Call SJ F3): persönlicher Anteil bei
            Immobilien-Deals, vom Kaufpreis. */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nb-immo">
            Provisionsanteil — {v.immoAnteil} %
          </Label>
          <input
            id="nb-immo"
            type="range"
            min={1}
            max={10}
            step={0.5}
            value={v.immoAnteil}
            onChange={(e) => set("immoAnteil", e.target.value)}
            className="h-9 w-full cursor-pointer accent-primary"
          />
          <p className="text-xs text-muted-foreground">
            Regler 1–10 % · Anteil vom Kaufpreis bei Immobilien-Deals.
          </p>
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
