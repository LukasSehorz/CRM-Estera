"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createDeal,
  updateDeal,
  deleteDeal,
  type DealInput,
} from "./actions";
import { OBJEKT_STATUS, PROVISIONSSATZ_PRESETS, bereichLabel } from "@/config/enums";
import {
  computeBWS,
  computeImmoProvision,
  computeProvision,
  MAX_ANZAHL_JAHRE,
  VV_ZAHLARTEN,
  type VvZahlart,
} from "@/lib/provision";
import { formatEURCents } from "@/lib/format";
import { CollapsibleSection } from "@/components/collapsible-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DateInput } from "@/components/ui/date-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Bereich = "immobilien" | "vv";
const NONE = "__none";

export type DealFormState = {
  contact_id: string;
  dealname: string;
  stage_id: string;
  naechster_termin: string;
  bemerkungen: string;
  // Nächster Schritt (3.4): ein konkreter Text + Fälligkeit statt loser Notizen
  next_step: string;
  next_step_faellig: string;
  // Immobilien
  kaufpreis: string;
  objekt_adresse: string;
  objekt_status: string;
  notartermin: string;
  provisionssatz: string;
  berater_anteil: string;
  // Vermögensverwaltung
  bws: string;
  sparbeitrag: string;
  anzahl_jahre: string;
  vv_zahlart: string; // factoring | ohne_factoring | ratierlich (7.1)
  tippgeber: string;
  tippgeber_satz: string;
};

function num(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isNaN(n) ? null : n;
}
function intNum(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (t === "") return null;
  const n = Math.trunc(Number(t));
  return Number.isNaN(n) ? null : n;
}
const txt = (s: string): string | null => (s.trim() === "" ? null : s.trim());

function boardPath(bereich: Bereich) {
  return bereich === "immobilien" ? "/immobilien" : "/vermoegensverwaltung";
}

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

export function DealForm({
  mode,
  dealId,
  bereich,
  initial,
  stages,
  contactOptions,
  contactName,
  vertrieblerStufe = 0,
  isGf = false,
  immoModus = "anteil_von_provision",
}: {
  mode: "create" | "edit";
  dealId?: string;
  bereich: Bereich;
  initial: DealFormState;
  stages: { id: string; name: string }[];
  contactOptions: { id: string; name: string }[];
  contactName?: string;
  vertrieblerStufe?: number;
  isGf?: boolean;
  immoModus?: "anteil_von_provision" | "anteil_von_kaufpreis";
}) {
  const router = useRouter();
  const [v, setV] = useState<DealFormState>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Im Bearbeiten-Modus den vorhandenen Namen nicht selbsttätig überschreiben.
  const [dealnameTouched, setDealnameTouched] = useState(mode === "edit");

  function set<K extends keyof DealFormState>(key: K, value: DealFormState[K]) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  function contactNameFor(id: string): string {
    if (mode === "edit") return contactName ?? "";
    return contactOptions.find((c) => c.id === id)?.name ?? "";
  }

  /** Konvention Immobilien: „Kundenname – Objektadresse". VV: „Kundenname". */
  function suggestName(contactId: string, adresse: string): string {
    const name = contactNameFor(contactId);
    if (!name) return "";
    if (bereich === "immobilien")
      return adresse.trim() ? `${name} – ${adresse.trim()}` : name;
    return name;
  }

  function onContactChange(id: string) {
    setV((prev) => ({
      ...prev,
      contact_id: id,
      dealname: dealnameTouched
        ? prev.dealname
        : suggestName(id, prev.objekt_adresse),
    }));
  }
  function onAdresseChange(adresse: string) {
    setV((prev) => ({
      ...prev,
      objekt_adresse: adresse,
      dealname: dealnameTouched
        ? prev.dealname
        : suggestName(prev.contact_id, adresse),
    }));
  }
  function onDealnameChange(value: string) {
    setDealnameTouched(true);
    set("dealname", value);
  }

  // BWS = Sparbeitrag × 12 × Jahre (automatisch mitgeführt, bleibt editierbar).
  function recalcBWS(sparbeitrag: string, jahre: string): string {
    const b = computeBWS(num(sparbeitrag), intNum(jahre));
    return b == null ? "" : String(b);
  }
  function onSparbeitragChange(val: string) {
    setV((prev) => ({
      ...prev,
      sparbeitrag: val,
      bws: recalcBWS(val, prev.anzahl_jahre),
    }));
  }
  function onJahreChange(val: string) {
    setV((prev) => ({
      ...prev,
      anzahl_jahre: val,
      bws: recalcBWS(prev.sparbeitrag, val),
    }));
  }

  function buildPayload(): DealInput {
    return {
      contact_id: v.contact_id,
      bereich,
      dealname: v.dealname,
      stage_id: v.stage_id,
      naechster_termin: txt(v.naechster_termin),
      bemerkungen: txt(v.bemerkungen),
      next_step: txt(v.next_step),
      next_step_faellig: txt(v.next_step_faellig),
      kaufpreis: num(v.kaufpreis),
      objekt_adresse: txt(v.objekt_adresse),
      objekt_status: (v.objekt_status || null) as DealInput["objekt_status"],
      notartermin: txt(v.notartermin),
      provisionssatz: num(v.provisionssatz),
      berater_anteil: num(v.berater_anteil),
      bws: num(v.bws),
      sparbeitrag: num(v.sparbeitrag),
      anzahl_jahre: intNum(v.anzahl_jahre),
      vv_zahlart: (v.vv_zahlart || "factoring") as DealInput["vv_zahlart"],
      tippgeber: txt(v.tippgeber),
      tippgeber_satz: num(v.tippgeber_satz),
    };
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!v.contact_id) {
      setError("Bitte einen Kontakt verknüpfen.");
      return;
    }
    if (!v.dealname.trim()) {
      setError("Bitte einen Dealnamen vergeben.");
      return;
    }
    // 7.5: Die BWS-Laufzeit ist auf 40 Jahre begrenzt.
    const jahre = intNum(v.anzahl_jahre);
    if (bereich === "vv" && jahre != null && (jahre < 1 || jahre > MAX_ANZAHL_JAHRE)) {
      setError(`Anzahl Jahre muss zwischen 1 und ${MAX_ANZAHL_JAHRE} liegen.`);
      return;
    }
    startTransition(async () => {
      const payload = buildPayload();
      const res =
        mode === "create"
          ? await createDeal(payload)
          : await updateDeal(dealId!, payload);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      if (mode === "create" && res.id) {
        toast.success("Deal angelegt");
        router.push(`/deals/${res.id}`);
      } else {
        toast.success("Änderungen gespeichert");
        router.refresh();
      }
    });
  }

  const prov =
    bereich === "vv"
      ? computeProvision({
          bws: num(v.bws),
          sparbeitrag: num(v.sparbeitrag),
          anzahlJahre: intNum(v.anzahl_jahre),
          zahlart: (v.vv_zahlart || "factoring") as VvZahlart,
          tippgeberSatz: num(v.tippgeber_satz),
          vertrieblerStufe,
        })
      : null;

  return (
    <form onSubmit={onSubmit} className="space-y-5 pb-24">
      {/* ── Deal-Basis ── */}
      <CollapsibleSection
        title="Deal"
        description={`Bereich: ${bereichLabel(bereich)} · Kontakt & Phase`}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Kontakt *" htmlFor="contact" className="sm:col-span-2">
            {mode === "edit" ? (
              <Input id="contact" value={contactName ?? ""} disabled />
            ) : contactOptions.length === 0 ? (
              <p className="rounded-md border border-border bg-surface-2 px-3 py-2 text-sm text-muted-foreground">
                Keine passenden Kontakte. Lege zuerst einen Kontakt mit
                Interesse {bereichLabel(bereich)} an.
              </p>
            ) : (
              <Select value={v.contact_id} onValueChange={onContactChange}>
                <SelectTrigger id="contact" className="w-full">
                  <SelectValue placeholder="Kontakt wählen" />
                </SelectTrigger>
                <SelectContent>
                  {contactOptions.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </Field>

          <Field label="Dealname *" htmlFor="dealname" className="sm:col-span-2">
            <Input
              id="dealname"
              value={v.dealname}
              onChange={(e) => onDealnameChange(e.target.value)}
              placeholder={
                bereich === "immobilien"
                  ? "Kundenname – Objektadresse"
                  : "Kundenname"
              }
              required
            />
          </Field>

          <Field label="Phase" htmlFor="stage">
            <Select value={v.stage_id} onValueChange={(val) => set("stage_id", val)}>
              <SelectTrigger id="stage" className="w-full">
                <SelectValue placeholder="Phase wählen" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Nächster Termin" htmlFor="naechster">
            <DateInput
              id="naechster"
              value={v.naechster_termin}
              onChange={(e) => set("naechster_termin", e.target.value)}
            />
          </Field>

          {/* Nächster Schritt (3.4): ein konkreter To-do-Text + Fälligkeit
              statt loser Notizen — Grundlage für die Deal-Health-Ampel. */}
          <Field
            label="Nächster Schritt"
            htmlFor="nextstep"
            className="sm:col-span-2"
          >
            <Input
              id="nextstep"
              value={v.next_step}
              onChange={(e) => set("next_step", e.target.value)}
              placeholder="z. B. Kunde zurückrufen, Unterlagen anfordern …"
            />
          </Field>
          <Field label="Fällig am" htmlFor="nextstepfaellig">
            <DateInput
              id="nextstepfaellig"
              value={v.next_step_faellig}
              onChange={(e) => set("next_step_faellig", e.target.value)}
            />
          </Field>
        </div>
      </CollapsibleSection>

      {/* ── Immobilien-Felder ── */}
      {bereich === "immobilien" && (
        <CollapsibleSection title="Objekt" description="Immobilien-Felder">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Kaufpreis (€)" htmlFor="kaufpreis">
              <CurrencyInput
                id="kaufpreis"
                value={v.kaufpreis}
                onValueChange={(val) => set("kaufpreis", val)}
              />
            </Field>
            <Field label="Objekt-Status" htmlFor="objstatus">
              <Select
                value={v.objekt_status || NONE}
                onValueChange={(val) =>
                  set("objekt_status", val === NONE ? "" : val)
                }
              >
                <SelectTrigger id="objstatus" className="w-full">
                  <SelectValue placeholder="Keine Angabe" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Keine Angabe</SelectItem>
                  {OBJEKT_STATUS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Objekt-Adresse"
              htmlFor="adresse"
              className="sm:col-span-2"
            >
              <Input
                id="adresse"
                value={v.objekt_adresse}
                onChange={(e) => onAdresseChange(e.target.value)}
                placeholder="Straße Hausnr., PLZ Ort"
              />
            </Field>
            <Field label="Notartermin" htmlFor="notar">
              <DateInput
                id="notar"
                value={v.notartermin}
                onChange={(e) => set("notartermin", e.target.value)}
              />
            </Field>

            {/* Provision (Schleife 2, 1.5): Satz variabel je Objekt/Bauträger.
                Das Feld darf der Berater pflegen; die €-Aufschlüsselung
                (Estera-Provision/Hausanteil) sieht nur die GF. */}
            <Field label="Provisionssatz (%)" htmlFor="provsatz">
              <div className="flex items-center gap-2">
                <Input
                  id="provsatz"
                  type="number"
                  min={0}
                  max={100}
                  step="0.1"
                  inputMode="decimal"
                  className="w-28"
                  value={v.provisionssatz}
                  onChange={(e) => set("provisionssatz", e.target.value)}
                  placeholder="z. B. 12"
                />
                <div className="flex gap-1">
                  {PROVISIONSSATZ_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => set("provisionssatz", String(p))}
                      className={cn(
                        "rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-primary/50",
                        num(v.provisionssatz) === p
                          ? "border-primary bg-primary/10 text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {p} %
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Variabel je Objekt/Bauträger.
              </p>
            </Field>
            {isGf ? (
              <Field label="Berater-Anteil (%)" htmlFor="beranteil">
                <Input
                  id="beranteil"
                  type="number"
                  min={1}
                  max={10}
                  step="0.5"
                  inputMode="decimal"
                  value={v.berater_anteil}
                  onChange={(e) => set("berater_anteil", e.target.value)}
                  placeholder="1–10"
                />
                <p className="text-xs text-muted-foreground">
                  Nur durch die Geschäftsführung setzbar.
                </p>
              </Field>
            ) : (
              <Field label="Berater-Anteil (%)">
                <p className="flex h-9 items-center rounded-md border border-border bg-surface-2 px-3 text-sm text-muted-foreground">
                  {v.berater_anteil ? `${v.berater_anteil} %` : "Wird von der Geschäftsführung gesetzt"}
                </p>
              </Field>
            )}
          </div>

          {/* Immobilien-Provisionsvorschau — Berater sieht nur den eigenen Anteil */}
          {num(v.kaufpreis) && num(v.provisionssatz) ? (
            <div className="mt-4 rounded-lg border border-border bg-surface-2 p-4">
              <div className="mb-2 text-sm font-medium">Provisionsvorschau</div>
              <dl className="space-y-1.5 text-sm">
                {(() => {
                  const ip = computeImmoProvision(
                    num(v.kaufpreis),
                    num(v.provisionssatz),
                    num(v.berater_anteil),
                    immoModus,
                  );
                  return (
                    <>
                      {isGf && (
                        <ProvRow
                          label={`Estera-Provision (${num(v.provisionssatz)} % vom Kaufpreis)`}
                          value={formatEURCents(ip.esteraProvision)}
                        />
                      )}
                      <ProvRow
                        label={
                          num(v.berater_anteil)
                            ? `Berater-Anteil (${num(v.berater_anteil)} %)`
                            : "Berater-Anteil (noch nicht gesetzt)"
                        }
                        value={formatEURCents(ip.beraterProvision)}
                        accent
                      />
                      {isGf && (
                        <ProvRow
                          label="Hausanteil"
                          value={formatEURCents(ip.hausAnteil)}
                        />
                      )}
                    </>
                  );
                })()}
              </dl>
            </div>
          ) : null}
        </CollapsibleSection>
      )}

      {/* ── VV-Felder + Provisionsvorschau ── */}
      {bereich === "vv" && (
        <CollapsibleSection
          title="Vermögensverwaltung"
          description="BWS · Zahlart & Provision"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Sparbeitrag mtl. (€)" htmlFor="sparbeitrag">
              <CurrencyInput
                id="sparbeitrag"
                value={v.sparbeitrag}
                onValueChange={onSparbeitragChange}
              />
            </Field>
            <Field label="Anzahl Jahre (max. 40)" htmlFor="jahre">
              <Input
                id="jahre"
                type="number"
                min={1}
                max={MAX_ANZAHL_JAHRE}
                inputMode="numeric"
                value={v.anzahl_jahre}
                onChange={(e) => onJahreChange(e.target.value)}
              />
            </Field>
            <Field label="BWS (€)" htmlFor="bws" className="sm:col-span-2">
              <CurrencyInput
                id="bws"
                value={v.bws}
                onValueChange={(val) => set("bws", val)}
              />
              <p className="text-xs text-muted-foreground">
                Automatisch aus Sparbeitrag × 12 × Jahre — bei Bedarf
                überschreibbar.
              </p>
            </Field>

            {/* Zahlart (7.1): ein Feld für die drei Fälle — der Einbehalt
                hängt am Factoring, nicht an einem separaten Häkchen. */}
            <Field label="Zahlart" htmlFor="zahlart" className="sm:col-span-2">
              <Select
                value={v.vv_zahlart || "factoring"}
                onValueChange={(val) => set("vv_zahlart", val)}
              >
                <SelectTrigger id="zahlart" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VV_ZAHLARTEN.map((z) => (
                    <SelectItem key={z.value} value={z.value}>
                      {z.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {VV_ZAHLARTEN.find((z) => z.value === (v.vv_zahlart || "factoring"))
                  ?.hinweis}
              </p>
            </Field>

            <Field label="Tippgeber" htmlFor="tippgeber">
              <Input
                id="tippgeber"
                value={v.tippgeber}
                onChange={(e) => set("tippgeber", e.target.value)}
                placeholder="Name (optional)"
              />
            </Field>
            <Field label="Tippgeber-Satz (%)" htmlFor="tippsatz">
              <Input
                id="tippsatz"
                type="number"
                min={0}
                max={100}
                inputMode="decimal"
                value={v.tippgeber_satz}
                onChange={(e) => set("tippgeber_satz", e.target.value)}
                placeholder="z. B. 10"
              />
              <p className="text-xs text-muted-foreground">
                Geht von deinem Anteil ab, nicht vom Hausanteil.
              </p>
            </Field>
          </div>

          {/* Berater-Vorschau (7.5): nur die Ergebnisse — BWS → Vorschau →
              Sofort → Einbehalt → Ratierlich. Die volle Kette (7,8 % →
              Factoring → Stufe) sieht nur die GF. */}
          {prov && (
            <div className="mt-4 rounded-lg border border-border bg-surface-2 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium">Provisionsvorschau</span>
                {isGf && (
                  <span className="text-xs text-muted-foreground">
                    Vertriebler-Stufe {vertrieblerStufe}%
                  </span>
                )}
              </div>
              <dl className="space-y-1.5 text-sm">
                <ProvRow label="BWS" value={formatEURCents(prov.bws)} />

                {/* Volle Kette nur für die GF (2.2 / 7.5) */}
                {isGf && (
                  <>
                    <ProvRow
                      label="Grundprovision (7,8 %)"
                      value={formatEURCents(prov.grundprovision)}
                    />
                    <ProvRow
                      label={
                        prov.einbehalt
                          ? "nach Factoring (×90 %)"
                          : "Provision (ohne Factoring)"
                      }
                      value={formatEURCents(prov.nettoProvision)}
                    />
                    <ProvRow
                      label="Hausanteil (Estera)"
                      value={formatEURCents(prov.hausAnteil)}
                    />
                  </>
                )}

                <ProvRow
                  label={`Deine Provision (${vertrieblerStufe} %)`}
                  value={formatEURCents(prov.vertrieblerGesamt)}
                  accent
                />
                {num(v.tippgeber_satz) ? (
                  <>
                    <ProvRow
                      label={`− Tippgeber (${num(v.tippgeber_satz)} %)`}
                      value={formatEURCents(prov.tippgeberAnteil)}
                    />
                    <ProvRow
                      label="= Dein Gewinn"
                      value={formatEURCents(prov.vertrieblerGewinn)}
                      accent
                    />
                  </>
                ) : null}

                <div className="my-1 border-t border-border" />
                {prov.ratierlich ? (
                  <ProvRow
                    label="Monatsrate (÷ 60, über 5 Jahre)"
                    value={formatEURCents(prov.monatsrate)}
                    accent
                  />
                ) : prov.einbehalt ? (
                  <>
                    <ProvRow
                      label="Sofort (85 %)"
                      value={formatEURCents(prov.sofortAuszahlung)}
                      accent
                    />
                    <ProvRow
                      label="Einbehalt (15 %, nach 12 Mon.)"
                      value={formatEURCents(prov.einbehaltBetrag)}
                    />
                  </>
                ) : (
                  <ProvRow
                    label="Voll sofort"
                    value={formatEURCents(prov.sofortAuszahlung)}
                    accent
                  />
                )}
              </dl>
            </div>
          )}
        </CollapsibleSection>
      )}

      {/* ── Notizen ── */}
      <CollapsibleSection
        title="Notizen"
        description="Interne Bemerkungen"
        defaultOpen={false}
      >
        <Field label="Bemerkungen" htmlFor="bemerkungen">
          <Textarea
            id="bemerkungen"
            rows={3}
            value={v.bemerkungen}
            onChange={(e) => set("bemerkungen", e.target.value)}
          />
        </Field>
      </CollapsibleSection>

      {/* ── Sticky Footer ── */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/90 px-6 py-3 backdrop-blur lg:left-64">
        <div className="flex items-center justify-between gap-4">
          <div className="min-h-5 text-sm text-destructive">{error}</div>
          <div className="flex items-center gap-2">
            {mode === "edit" && dealId && <DeleteButton id={dealId} />}
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(boardPath(bereich))}
            >
              Abbrechen
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? "Speichern …"
                : mode === "create"
                  ? "Deal anlegen"
                  : "Deal speichern"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function ProvRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular-nums",
          accent ? "font-semibold text-primary" : "font-medium",
        )}
      >
        {value}
      </dd>
    </div>
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
        if (confirm("Diesen Deal wirklich löschen?"))
          startTransition(() => deleteDeal(id));
      }}
      className="text-destructive hover:text-destructive"
    >
      <Trash2 className="mr-1 h-4 w-4" />
      Löschen
    </Button>
  );
}
