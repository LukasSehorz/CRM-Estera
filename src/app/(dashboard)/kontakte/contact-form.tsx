"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createContact,
  updateContact,
  deleteContact,
  type ContactInput,
} from "./actions";
import {
  KONTAKT_STATUS,
  TERMIN_STATUS,
  LEADQUELLE,
  FINANZIERUNGSRAHMEN_PRESETS,
  FINANZIERUNGSSTATUS,
  EINSCHAETZUNG_STATUS,
  BEREICH,
} from "@/config/enums";
import { CollapsibleSection } from "@/components/collapsible-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none";

export type FormState = {
  vorname: string;
  nachname: string;
  email: string;
  telefon: string;
  berater_id: string;
  status: string;
  termin_status: string;
  leadquelle: string;
  interesse: string[];
  nettoverdienst_monatlich: string;
  eigenkapital: string;
  finanzierungsrahmen_betrag: string;
  einschaetzung_erhalten: boolean;
  datum_einschaetzung: string;
  eingeschaetzter_betrag: string;
  einschaetzung_durch: string;
  einschaetzung_status: string;
  unterlagen_vollstaendig: boolean;
  fehlende_unterlagen: string;
  finanzierungsstatus: string;
  ist_selbststaendig: boolean;
  ist_immobilienbesitzer: boolean;
};

function num(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isNaN(n) ? null : n;
}
const txt = (s: string): string | null => (s.trim() === "" ? null : s.trim());

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function ContactForm({
  mode,
  contactId,
  initial,
  canAssignBerater,
  beraterOptions,
}: {
  mode: "create" | "edit";
  contactId?: string;
  initial: FormState;
  canAssignBerater: boolean;
  beraterOptions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [v, setV] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
  }
  function toggleInteresse(value: string, checked: boolean) {
    setV((prev) => ({
      ...prev,
      interesse: checked
        ? [...prev.interesse, value]
        : prev.interesse.filter((x) => x !== value),
    }));
  }

  function buildPayload(): ContactInput {
    return {
      vorname: v.vorname,
      nachname: v.nachname,
      email: txt(v.email),
      telefon: txt(v.telefon),
      berater_id: v.berater_id || null,
      status: v.status as ContactInput["status"],
      termin_status: v.termin_status as ContactInput["termin_status"],
      leadquelle: (v.leadquelle || null) as ContactInput["leadquelle"],
      interesse: v.interesse as ContactInput["interesse"],
      nettoverdienst_monatlich: num(v.nettoverdienst_monatlich),
      eigenkapital: num(v.eigenkapital),
      finanzierungsrahmen_betrag: num(v.finanzierungsrahmen_betrag),
      einschaetzung_erhalten: v.einschaetzung_erhalten,
      datum_einschaetzung: txt(v.datum_einschaetzung),
      eingeschaetzter_betrag: num(v.eingeschaetzter_betrag),
      einschaetzung_durch: txt(v.einschaetzung_durch),
      einschaetzung_status: (v.einschaetzung_status ||
        null) as ContactInput["einschaetzung_status"],
      unterlagen_vollstaendig: v.unterlagen_vollstaendig,
      fehlende_unterlagen: txt(v.fehlende_unterlagen),
      finanzierungsstatus: (v.finanzierungsstatus ||
        "offen") as ContactInput["finanzierungsstatus"],
      ist_selbststaendig: v.ist_selbststaendig,
      ist_immobilienbesitzer: v.ist_immobilienbesitzer,
    };
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!v.vorname.trim() || !v.nachname.trim()) {
      setError("Vor- und Nachname sind erforderlich.");
      return;
    }
    startTransition(async () => {
      const payload = buildPayload();
      const res =
        mode === "create"
          ? await createContact(payload)
          : await updateContact(contactId!, payload);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      if (mode === "create" && res.id) {
        toast.success("Kontakt angelegt");
        router.push(`/kontakte/${res.id}`);
      } else {
        toast.success("Änderungen gespeichert");
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 pb-24">
      {/* ── Basis ── */}
      <CollapsibleSection title="Basis" description="Stammdaten & Zuordnung">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Vorname *" htmlFor="vorname">
            <Input
              id="vorname"
              value={v.vorname}
              onChange={(e) => set("vorname", e.target.value)}
              required
            />
          </Field>
          <Field label="Nachname *" htmlFor="nachname">
            <Input
              id="nachname"
              value={v.nachname}
              onChange={(e) => set("nachname", e.target.value)}
              required
            />
          </Field>
          <Field label="E-Mail" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={v.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </Field>
          <Field label="Telefon" htmlFor="telefon">
            <Input
              id="telefon"
              value={v.telefon}
              onChange={(e) => set("telefon", e.target.value)}
            />
          </Field>

          {canAssignBerater && (
            <Field label="Berater" htmlFor="berater">
              <Select
                value={v.berater_id}
                onValueChange={(val) => set("berater_id", val)}
              >
                <SelectTrigger id="berater">
                  <SelectValue placeholder="Berater wählen" />
                </SelectTrigger>
                <SelectContent>
                  {beraterOptions.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Status" htmlFor="status">
            <Select value={v.status} onValueChange={(val) => set("status", val)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KONTAKT_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Termin-Status" htmlFor="termin">
            <Select
              value={v.termin_status}
              onValueChange={(val) => set("termin_status", val)}
            >
              <SelectTrigger id="termin">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TERMIN_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Leadquelle" htmlFor="leadquelle">
            <Select
              value={v.leadquelle || NONE}
              onValueChange={(val) => set("leadquelle", val === NONE ? "" : val)}
            >
              <SelectTrigger id="leadquelle">
                <SelectValue placeholder="Keine Angabe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Keine Angabe</SelectItem>
                {LEADQUELLE.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Interesse" className="sm:col-span-2">
            <div className="flex flex-wrap gap-4 pt-1">
              {BEREICH.map((b) => (
                <label
                  key={b.value}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <Checkbox
                    checked={v.interesse.includes(b.value)}
                    onCheckedChange={(c) => toggleInteresse(b.value, c === true)}
                  />
                  {b.label}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Steuert, in welcher Pipeline der Kontakt geführt wird.
            </p>
          </Field>

          {/* Kundentyp (Schleife 2, 3.2): steuert die Dokumenten-Checkliste */}
          <Field label="Kundentyp" className="sm:col-span-2">
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={v.ist_selbststaendig}
                  onCheckedChange={(c) => set("ist_selbststaendig", c === true)}
                />
                Selbstständig
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={v.ist_immobilienbesitzer}
                  onCheckedChange={(c) =>
                    set("ist_immobilienbesitzer", c === true)
                  }
                />
                Immobilienbesitzer
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              Blendet die passenden Gruppen der Dokumenten-Checkliste ein.
            </p>
          </Field>
        </div>
      </CollapsibleSection>

      {/* ── Finanzdaten ── */}
      <CollapsibleSection
        title="Finanzdaten"
        description="Einkommen, Eigenkapital, Rahmen"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nettoverdienst monatlich (€)" htmlFor="netto">
            <CurrencyInput
              id="netto"
              value={v.nettoverdienst_monatlich}
              onValueChange={(val) => set("nettoverdienst_monatlich", val)}
            />
          </Field>
          <Field label="Eigenkapital (€)" htmlFor="ek">
            <CurrencyInput
              id="ek"
              value={v.eigenkapital}
              onValueChange={(val) => set("eigenkapital", val)}
            />
          </Field>
          <Field
            label="Finanzierungsrahmen (€)"
            htmlFor="rahmen"
            className="sm:col-span-2"
          >
            <CurrencyInput
              id="rahmen"
              value={v.finanzierungsrahmen_betrag}
              onValueChange={(val) => set("finanzierungsrahmen_betrag", val)}
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {FINANZIERUNGSRAHMEN_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set("finanzierungsrahmen_betrag", String(p))}
                  className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
                >
                  {p / 1000}k
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Freier Betrag ist führend; Presets sind nur Schnellauswahl.
            </p>
          </Field>

          {/* Finanzierungsstatus (Schleife 2, 3.4): Akten-Status auf einen Blick */}
          <Field label="Finanzierungsstatus" htmlFor="finstatus">
            <Select
              value={v.finanzierungsstatus || "offen"}
              onValueChange={(val) => set("finanzierungsstatus", val)}
            >
              <SelectTrigger id="finstatus" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FINANZIERUNGSSTATUS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </CollapsibleSection>

      {/* ── Einschätzung ── */}
      <CollapsibleSection
        title="Finanzierungseinschätzung"
        description="Bank-/Finanzierer-Feedback"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Einschätzung erhalten?" className="sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={v.einschaetzung_erhalten}
                onCheckedChange={(c) =>
                  set("einschaetzung_erhalten", c === true)
                }
              />
              Ja, eine Einschätzung liegt vor
            </label>
          </Field>
          <Field label="Datum der Einschätzung" htmlFor="datum">
            <DateInput
              id="datum"
              value={v.datum_einschaetzung}
              onChange={(e) => set("datum_einschaetzung", e.target.value)}
            />
          </Field>
          <Field label="Eingeschätzter Betrag (€)" htmlFor="betrag">
            <CurrencyInput
              id="betrag"
              value={v.eingeschaetzter_betrag}
              onValueChange={(val) => set("eingeschaetzter_betrag", val)}
            />
            {/* Plausibilität (Schleife 2, 1.6): Warnung, blockiert aber nicht. */}
            {(() => {
              const betrag = Number(v.eingeschaetzter_betrag);
              const rahmen = Number(v.finanzierungsrahmen_betrag);
              return betrag > 0 && rahmen > 0 && betrag > rahmen ? (
                <p className="flex items-center gap-1.5 text-xs font-medium text-warning">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  Betrag liegt über dem Finanzierungsrahmen (
                  {new Intl.NumberFormat("de-DE").format(rahmen)} €) — bitte
                  prüfen.
                </p>
              ) : null;
            })()}
          </Field>
          <Field label="Einschätzung durch" htmlFor="durch">
            <Input
              id="durch"
              placeholder="Bank / Finanzierer"
              value={v.einschaetzung_durch}
              onChange={(e) => set("einschaetzung_durch", e.target.value)}
            />
          </Field>
          <Field label="Einschätzung-Status" htmlFor="estatus">
            <Select
              value={v.einschaetzung_status || NONE}
              onValueChange={(val) =>
                set("einschaetzung_status", val === NONE ? "" : val)
              }
            >
              <SelectTrigger id="estatus">
                <SelectValue placeholder="Keine Angabe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Keine Angabe</SelectItem>
                {EINSCHAETZUNG_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </CollapsibleSection>

      {/* ── Unterlagen ── */}
      <CollapsibleSection title="Unterlagen" description="Vollständigkeit">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Unterlagen vollständig?" className="sm:col-span-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <Checkbox
                checked={v.unterlagen_vollstaendig}
                onCheckedChange={(c) =>
                  set("unterlagen_vollstaendig", c === true)
                }
              />
              Ja, alle Unterlagen liegen vor
            </label>
          </Field>
          <Field
            label="Fehlende Unterlagen"
            htmlFor="fehlend"
            className="sm:col-span-2"
          >
            <Textarea
              id="fehlend"
              rows={3}
              value={v.fehlende_unterlagen}
              onChange={(e) => set("fehlende_unterlagen", e.target.value)}
            />
          </Field>
        </div>
      </CollapsibleSection>

      {/* ── Sticky Footer: Aktionen ── */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/90 px-6 py-3 backdrop-blur lg:left-64">
        <div className="flex items-center justify-between gap-4">
          <div className="min-h-5 text-sm text-destructive">{error}</div>
          <div className="flex items-center gap-2">
            {mode === "edit" && contactId && (
              <DeleteButton id={contactId} />
            )}
            <Button type="button" variant="outline" onClick={() => router.push("/kontakte")}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Speichern …"
                : mode === "create"
                  ? "Kontakt anlegen"
                  : "Kontakt speichern"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function DeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  // Kein verschachteltes <form> (ungültiges HTML) -> Server-Action direkt aufrufen.
  return (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (confirm("Diesen Kontakt wirklich löschen?"))
          startTransition(() => deleteContact(id));
      }}
      className="text-destructive hover:text-destructive"
    >
      <Trash2 className="mr-1 h-4 w-4" />
      Löschen
    </Button>
  );
}
