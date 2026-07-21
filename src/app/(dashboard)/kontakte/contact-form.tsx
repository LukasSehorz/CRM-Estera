"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import {
  createContact,
  updateContact,
  deleteContact,
  setDocumentStatus,
  type ContactInput,
} from "./actions";
import { StagedChecklist, type StagedByType } from "./staged-checklist";
import type { DocType } from "./document-checklist";
import {
  KONTAKT_STATUS,
  TERMIN_STATUS,
  LEADQUELLE,
  FINANZIERUNGSSTATUS,
  EINSCHAETZUNG,
  BEREICH,
  istQualifiziert,
  QUALIFIZIERT_MIN_NETTO,
  QUALIFIZIERT_MIN_EIGENKAPITAL,
} from "@/config/enums";
import { formatEUR } from "@/lib/format";
import { Pill } from "@/components/ui/pill";
import { CheckCircle2 } from "lucide-react";
import { CollapsibleSection } from "@/components/collapsible-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
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

// Upload direkt beim Anlegen (Call SJ 1.3): Dateien werden zwischengespeichert
// und nach dem Anlegen (sobald die Kontakt-ID existiert) hochgeladen.
const BUCKET = "kundendokumente";
function safeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .slice(-120);
}

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
  // Finanzierungseinschätzung NEU (15.2): 3 Stati + „finanzierbar bis" + belegt
  einschaetzung: string;
  eingeschaetzter_betrag: string;
  belegt_deal_id: string;
  unterlagen_vollstaendig: boolean;
  fehlende_unterlagen: string;
  finanzierungsstatus: string;
  ist_selbststaendig: boolean;
  ist_immobilienbesitzer: boolean;
  ist_bestandskunde: boolean;
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
  dealOptions = [],
  docTypes = [],
}: {
  mode: "create" | "edit";
  contactId?: string;
  initial: FormState;
  canAssignBerater: boolean;
  beraterOptions: { id: string; name: string }[];
  /** Immobilien-Deals des Kontakts — für „auf Objekt belegt" (15.2). */
  dealOptions?: { id: string; name: string }[];
  /** Dokumenttypen für die Checkliste beim Anlegen (Immobilien). */
  docTypes?: DocType[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [v, setV] = useState<FormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Checklisten-Dateien je Dokumenttyp, vorgemerkt (Upload nach dem Anlegen).
  const [stagedTyped, setStagedTyped] = useState<StagedByType>({});

  // Nach dem Anlegen: vorgemerkte Dateien (frei + Checkliste) auf die neue
  // Kontakt-ID hochladen. Fehler einzelner Dateien blockieren den Flow nicht.
  async function uploadAllStaged(contactId: string): Promise<number> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let ok = 0;

    const putOne = async (
      file: File,
      kategorie: string,
      documentTypeId: string | null,
    ): Promise<boolean> => {
      const path = `${contactId}/${crypto.randomUUID()}_${safeName(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          upsert: false,
          contentType: file.type || undefined,
        });
      if (upErr) {
        // Echte Ursache protokollieren (Call SJ P5: „Ursache unklar").
        console.error("Storage-Upload fehlgeschlagen:", upErr);
        return false;
      }
      const { error: insErr } = await supabase.from("contact_documents").insert({
        contact_id: contactId,
        dateiname: file.name,
        storage_path: path,
        kategorie,
        document_type_id: documentTypeId,
        groesse: file.size,
        uploaded_by: user?.id ?? null,
      });
      if (insErr) {
        await supabase.storage.from(BUCKET).remove([path]);
        console.error("contact_documents-Insert fehlgeschlagen:", insErr);
        return false;
      }
      return true;
    };

    // Checklisten-Dokumente (typisiert) + „vorhanden"-Haken setzen
    for (const [typeId, files] of Object.entries(stagedTyped)) {
      const typ = docTypes.find((t) => t.id === typeId);
      let any = false;
      for (const file of files) {
        if (await putOne(file, typ?.name ?? "Sonstige", typeId)) {
          ok++;
          any = true;
        }
      }
      if (any) await setDocumentStatus(contactId, typeId, true, null);
    }
    return ok;
  }

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
      einschaetzung: (v.einschaetzung ||
        "ausstehend") as ContactInput["einschaetzung"],
      eingeschaetzter_betrag: num(v.eingeschaetzter_betrag),
      belegt_deal_id: v.belegt_deal_id || null,
      unterlagen_vollstaendig: v.unterlagen_vollstaendig,
      fehlende_unterlagen: txt(v.fehlende_unterlagen),
      finanzierungsstatus: (v.finanzierungsstatus ||
        "offen") as ContactInput["finanzierungsstatus"],
      ist_selbststaendig: v.ist_selbststaendig,
      ist_immobilienbesitzer: v.ist_immobilienbesitzer,
      ist_bestandskunde: v.ist_bestandskunde,
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
        const hatDocs = Object.keys(stagedTyped).length > 0;
        if (hatDocs) {
          const ok = await uploadAllStaged(res.id);
          toast.success(
            ok > 0
              ? `Kunde angelegt · ${ok} Dokument${ok === 1 ? "" : "e"} hochgeladen`
              : "Kunde angelegt",
          );
        } else {
          toast.success("Kunde angelegt");
        }
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
              Steuert, in welcher Pipeline der Kunde geführt wird.
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

          {/* Segment (Feedback SJ): berechnet sich automatisch aus den Deals —
              nur Altbestand wird manuell markiert. */}
          <Field label="Segment" className="sm:col-span-2">
            <label className="flex w-fit cursor-pointer items-center gap-2 pt-1 text-sm">
              <Checkbox
                checked={v.ist_bestandskunde}
                onCheckedChange={(c) => set("ist_bestandskunde", c === true)}
              />
              Bestandskunde (Altbestand — Abschlüsse liegen vor dem CRM)
            </label>
            <p className="text-xs text-muted-foreground">
              Sonst automatisch: ohne Deal „Interessent“, mit offenem Deal
              „In Pipeline“, mit gewonnenem Deal „Bestandskunde“.
            </p>
          </Field>
        </div>
      </CollapsibleSection>

      {/* ── Finanzdaten ── */}
      <CollapsibleSection
        title="Finanzdaten"
        description="Einkommen & Eigenkapital — steuern die Qualifikation"
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

          {/* Finanzierungsstatus (3.4): Akten-Status auf einen Blick */}
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

          {/* Qualifikation (15.2): automatisch aus Netto + EK, kein Handstatus */}
          <Field label="Qualifikation (automatisch)">
            <div className="flex h-9 items-center">
              {istQualifiziert(
                num(v.nettoverdienst_monatlich),
                num(v.eigenkapital),
              ) ? (
                <Pill tone="success">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Qualifiziert
                </Pill>
              ) : (
                <span className="text-xs text-muted-foreground">
                  Nicht qualifiziert — ab {formatEUR(QUALIFIZIERT_MIN_NETTO)}{" "}
                  netto & {formatEUR(QUALIFIZIERT_MIN_EIGENKAPITAL)} EK
                </span>
              )}
            </div>
          </Field>
        </div>
      </CollapsibleSection>

      {/* ── Finanzierungseinschätzung NEU (15.2) — nur bei Immobilien-Interesse ── */}
      {v.interesse.includes("immobilien") && (
        <CollapsibleSection
          title="Finanzierungseinschätzung"
          description="Ausstehend · Eingeschätzt · Nicht finanzierbar (nur Immobilien)"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Einschätzung" htmlFor="einsch" className="sm:col-span-2">
              <Select
                value={v.einschaetzung || "ausstehend"}
                onValueChange={(val) => set("einschaetzung", val)}
              >
                <SelectTrigger id="einsch" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EINSCHAETZUNG.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Nur bei „eingeschätzt": finanzierbar bis + auf Objekt belegt */}
            {v.einschaetzung === "eingeschaetzt" && (
              <>
                <Field
                  label="Finanzierbar bis ca. (€)"
                  htmlFor="betrag"
                  className="sm:col-span-2"
                >
                  <CurrencyInput
                    id="betrag"
                    value={v.eingeschaetzter_betrag}
                    onValueChange={(val) => set("eingeschaetzter_betrag", val)}
                  />
                </Field>

                <Field label="Bereits auf Objekt belegt?" className="sm:col-span-2">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={v.belegt_deal_id !== ""}
                      onCheckedChange={(c) =>
                        set(
                          "belegt_deal_id",
                          c === true ? (dealOptions[0]?.id ?? "__belegt") : "",
                        )
                      }
                    />
                    Das Budget ist bereits einem Objekt zugeordnet
                  </label>
                  {v.belegt_deal_id !== "" && dealOptions.length > 0 && (
                    <Select
                      value={
                        dealOptions.some((d) => d.id === v.belegt_deal_id)
                          ? v.belegt_deal_id
                          : dealOptions[0].id
                      }
                      onValueChange={(val) => set("belegt_deal_id", val)}
                    >
                      <SelectTrigger className="mt-2 w-full">
                        <SelectValue placeholder="Objekt/Deal wählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {dealOptions.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {v.belegt_deal_id !== "" && dealOptions.length === 0 && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      Noch kein Immobilien-Deal vorhanden — lege zuerst einen an,
                      um ihn zu verknüpfen.
                    </p>
                  )}
                </Field>
              </>
            )}
          </div>
        </CollapsibleSection>
      )}

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

      {/* Dokumenten-Checkliste beim Anlegen — NUR bei Immobilien-Interesse.
          Ohne Immobilien gibt es kein Dokumentenfeld (Wunsch Lukas). Dateien
          werden nach dem Anlegen hochgeladen. */}
      {mode === "create" &&
        v.interesse.includes("immobilien") &&
        docTypes.length > 0 && (
          <CollapsibleSection
            title="Unterlagen-Checkliste (Optional)"
            description="Dateien je Punkt vormerken — Upload nach dem Anlegen"
          >
            <StagedChecklist
              types={docTypes}
              istSelbststaendig={v.ist_selbststaendig}
              istImmobilienbesitzer={v.ist_immobilienbesitzer}
              value={stagedTyped}
              onChange={setStagedTyped}
            />
          </CollapsibleSection>
        )}

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
                  ? "Kunden anlegen"
                  : "Kunden speichern"}
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
        if (confirm("Diesen Kunden wirklich löschen?"))
          startTransition(() => deleteContact(id));
      }}
      className="text-destructive hover:text-destructive"
    >
      <Trash2 className="mr-1 h-4 w-4" />
      Löschen
    </Button>
  );
}
