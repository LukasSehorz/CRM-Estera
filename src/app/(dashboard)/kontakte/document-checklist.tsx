"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Paperclip, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { DOKUMENT_UPLOAD_AKTIV } from "@/config/enums";
import { setDocumentStatus } from "./actions";
import { Checkbox } from "@/components/ui/checkbox";
import { CollapsibleSection } from "@/components/collapsible-section";

const BUCKET = "kundendokumente";
const MAX_BYTES = 15 * 1024 * 1024;

function safeName(name: string): string {
  return name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").slice(-120);
}

export type DocType = {
  id: string;
  gruppe: "allgemein" | "selbststaendig" | "immobilienbesitzer";
  name: string;
  position: number;
};

export type DocStatus = {
  vorhanden: boolean;
  document_id: string | null;
  dateiname: string | null;
  storage_path: string | null;
};

const GRUPPEN_LABEL: Record<DocType["gruppe"], string> = {
  allgemein: "Allgemeine Unterlagen",
  selbststaendig: "Zusätzlich für Selbstständige",
  immobilienbesitzer: "Zusätzlich für Immobilienbesitzer",
};

/**
 * Feste Dokumenten-Checkliste (Schleife 2, 3.1/3.2) — nur Immobilien.
 * Status je Punkt: vorhanden/fehlt. Optionaler Datei-Upload je Punkt
 * (hinter dem DSGVO-Schalter). Fehlende Dokumente blockieren nichts.
 */
export function DocumentChecklist({
  contactId,
  istSelbststaendig,
  istImmobilienbesitzer,
  types,
  status,
}: {
  contactId: string;
  istSelbststaendig: boolean;
  istImmobilienbesitzer: boolean;
  types: DocType[];
  status: Record<string, DocStatus>;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTypeId, setUploadTypeId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();

  const sichtbar = types.filter(
    (t) =>
      t.gruppe === "allgemein" ||
      (t.gruppe === "selbststaendig" && istSelbststaendig) ||
      (t.gruppe === "immobilienbesitzer" && istImmobilienbesitzer),
  );
  const vorhandenCount = sichtbar.filter((t) => status[t.id]?.vorhanden).length;
  const pct = sichtbar.length
    ? Math.round((vorhandenCount / sichtbar.length) * 100)
    : 0;

  const gruppen = (
    ["allgemein", "selbststaendig", "immobilienbesitzer"] as const
  ).filter((g) => sichtbar.some((t) => t.gruppe === g));

  function toggle(t: DocType, checked: boolean) {
    start(async () => {
      const res = await setDocumentStatus(
        contactId,
        t.id,
        checked,
        status[t.id]?.document_id ?? null,
      );
      if ("error" in res) toast.error(res.error);
      else router.refresh();
    });
  }

  function pickFile(typeId: string) {
    setUploadTypeId(typeId);
    fileRef.current?.click();
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const typeId = uploadTypeId;
    setUploadTypeId(null);
    if (!file || !typeId) return;
    if (file.size > MAX_BYTES) {
      toast.error("Datei zu groß (max. 15 MB).");
      return;
    }
    const typ = types.find((t) => t.id === typeId);
    setBusy(true);
    try {
      const path = `${contactId}/${crypto.randomUUID()}_${safeName(file.name)}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type || undefined });
      if (upErr) throw upErr;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: doc, error: insErr } = await supabase
        .from("contact_documents")
        .insert({
          contact_id: contactId,
          dateiname: file.name,
          storage_path: path,
          kategorie: typ?.name ?? "Sonstige",
          groesse: file.size,
          uploaded_by: user?.id ?? null,
        })
        .select("id")
        .single();
      if (insErr || !doc) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw insErr ?? new Error("insert fehlgeschlagen");
      }
      const res = await setDocumentStatus(contactId, typeId, true, doc.id);
      if ("error" in res) throw new Error(res.error);
      toast.success("Dokument hochgeladen und abgehakt");
      router.refresh();
    } catch {
      toast.error("Upload fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }

  async function download(s: DocStatus) {
    if (!s.storage_path) return;
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(s.storage_path, 60);
    if (error || !data) {
      toast.error("Download nicht möglich.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function removeFile(t: DocType, s: DocStatus) {
    if (!s.document_id || !s.storage_path) return;
    if (!confirm(`Datei zu „${t.name}" wirklich löschen?`)) return;
    const { error } = await supabase
      .from("contact_documents")
      .delete()
      .eq("id", s.document_id);
    if (error) {
      toast.error("Löschen fehlgeschlagen.");
      return;
    }
    await supabase.storage.from(BUCKET).remove([s.storage_path]);
    await setDocumentStatus(contactId, t.id, false, null);
    toast.success("Datei gelöscht");
    router.refresh();
  }

  return (
    <CollapsibleSection
      title="Dokumenten-Checkliste"
      description={`${vorhandenCount} von ${sichtbar.length} Dokumenten vorhanden`}
    >
      {/* Fortschritt (3.1) */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              pct === 100 ? "bg-success" : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="shrink-0 text-sm font-medium tabular-nums">
          {vorhandenCount} / {sichtbar.length}
        </span>
      </div>

      <input ref={fileRef} type="file" className="hidden" onChange={onFile} />

      <div className="space-y-5">
        {gruppen.map((g) => (
          <div key={g}>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {GRUPPEN_LABEL[g]}
            </p>
            <ul className="divide-y divide-border">
              {sichtbar
                .filter((t) => t.gruppe === g)
                .map((t) => {
                  const s = status[t.id];
                  return (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 py-2 text-sm"
                    >
                      <Checkbox
                        checked={s?.vorhanden ?? false}
                        disabled={pending || busy}
                        onCheckedChange={(c) => toggle(t, c === true)}
                      />
                      <span
                        className={cn(
                          "min-w-0 flex-1",
                          s?.vorhanden
                            ? "text-muted-foreground line-through decoration-border"
                            : "text-foreground",
                        )}
                      >
                        {t.name}
                      </span>
                      {s?.document_id ? (
                        <span className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => download(s)}
                            title={`„${s.dateiname}" herunterladen`}
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFile(t, s)}
                            title="Datei löschen"
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </span>
                      ) : DOKUMENT_UPLOAD_AKTIV ? (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => pickFile(t.id)}
                          title="Datei anhängen"
                          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                      ) : null}
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Fehlende Dokumente blockieren keinen Deal — die Liste dient der
        Übersicht (und der Ampel im Berater-Cockpit).
      </p>
    </CollapsibleSection>
  );
}
