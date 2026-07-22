"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronDown,
  Download,
  FileArchive,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { DOKUMENT_UPLOAD_AKTIV } from "@/config/enums";
import { formatBytes, formatDate } from "@/lib/format";
import { buildZip, uniqueName } from "@/lib/zip";
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

/** Eine hochgeladene Datei (14.2: mehrere je Typ). */
export type DocFile = {
  id: string;
  dateiname: string;
  storage_path: string;
  groesse: number | null;
  created_at?: string;
};

/** Manueller „vorhanden"-Haken je Typ (auch ohne Datei setzbar). */
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
 * Feste Dokumenten-Checkliste (3.1/3.2/14.2) — nur Immobilien.
 * Je Punkt: Status vorhanden/fehlt + BELIEBIG VIELE Dateien (Gehaltsnachweis
 * 1/3, 2/3 …), jederzeit nachreichbar (kein Sperren), per Klick oder
 * Drag & Drop. „Alle als ZIP" lädt sämtliche Dateien des Kunden gebündelt.
 */
export function DocumentChecklist({
  contactId,
  istSelbststaendig,
  istImmobilienbesitzer,
  types,
  vorhanden,
  filesByType,
  onChanged,
}: {
  contactId: string;
  istSelbststaendig: boolean;
  istImmobilienbesitzer: boolean;
  types: DocType[];
  vorhanden: Record<string, boolean>;
  filesByType: Record<string, DocFile[]>;
  /** Optionaler Callback nach Änderungen (für Client-Kontexte ohne
   *  Server-Reload, z. B. Checkliste im Deal-Anlegen). */
  onChanged?: () => void;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  // Welcher Checklisten-Typ gerade hochgeladen wird — bewusst als REF, nicht als
  // State: pickFile() öffnet den Datei-Dialog synchron direkt nach dem Setzen.
  // Bei State läse onFile() ggf. noch den alten (null) Wert aus dem Closure,
  // bevor React neu gerendert hat → Upload feuerte gar nicht (Bug Call SJ).
  const uploadTypeRef = useRef<string | null>(null);
  const [busyType, setBusyType] = useState<string | null>(null);
  const [dragType, setDragType] = useState<string | null>(null);
  const [zipping, setZipping] = useState(false);
  const [pending, start] = useTransition();
  // Welche Checklisten-Punkte sind aufgeklappt (zeigen ihre Dateien)?
  const [openTypes, setOpenTypes] = useState<Set<string>>(new Set());
  const toggleType = (id: string) =>
    setOpenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const sichtbar = types.filter(
    (t) =>
      t.gruppe === "allgemein" ||
      (t.gruppe === "selbststaendig" && istSelbststaendig) ||
      (t.gruppe === "immobilienbesitzer" && istImmobilienbesitzer),
  );
  // „vorhanden" = manuell abgehakt ODER mindestens eine Datei vorhanden.
  const istVorhanden = (id: string) =>
    (vorhanden[id] ?? false) || (filesByType[id]?.length ?? 0) > 0;
  const vorhandenCount = sichtbar.filter((t) => istVorhanden(t.id)).length;
  const pct = sichtbar.length
    ? Math.round((vorhandenCount / sichtbar.length) * 100)
    : 0;
  const alleDateien = sichtbar.flatMap((t) => filesByType[t.id] ?? []);

  const gruppen = (
    ["allgemein", "selbststaendig", "immobilienbesitzer"] as const
  ).filter((g) => sichtbar.some((t) => t.gruppe === g));

  function toggle(t: DocType, checked: boolean) {
    start(async () => {
      const res = await setDocumentStatus(contactId, t.id, checked, null);
      if ("error" in res) toast.error(res.error);
      else {
        router.refresh();
        onChanged?.();
      }
    });
  }

  function pickFile(typeId: string) {
    uploadTypeRef.current = typeId;
    fileRef.current?.click();
  }

  async function uploadFiles(typeId: string, files: FileList | File[]) {
    const typ = types.find((t) => t.id === typeId);
    setBusyType(typeId);
    let ok = 0;
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_BYTES) {
          toast.error(`„${file.name}" ist zu groß (max. 15 MB).`);
          continue;
        }
        const path = `${contactId}/${crypto.randomUUID()}_${safeName(file.name)}`;
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, {
            upsert: false,
            contentType: file.type || undefined,
          });
        if (upErr) {
          // Echte Ursache zeigen statt generischem Toast (Call SJ P5:
          // „Ursache unklar"). Typische Meldungen: „Bucket not found",
          // „new row violates row-level security policy", Größenlimit.
          console.error("Storage-Upload fehlgeschlagen:", upErr);
          toast.error(`Upload von „${file.name}" fehlgeschlagen: ${upErr.message}`);
          continue;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error: insErr } = await supabase.from("contact_documents").insert({
          contact_id: contactId,
          dateiname: file.name,
          storage_path: path,
          kategorie: typ?.name ?? "Sonstige",
          document_type_id: typeId,
          groesse: file.size,
          uploaded_by: user?.id ?? null,
        });
        if (insErr) {
          await supabase.storage.from(BUCKET).remove([path]);
          console.error("contact_documents-Insert fehlgeschlagen:", insErr);
          toast.error(
            `„${file.name}" konnte nicht gespeichert werden: ${insErr.message}`,
          );
          continue;
        }
        ok++;
      }
      if (ok > 0) {
        await setDocumentStatus(contactId, typeId, true, null);
        setOpenTypes((prev) => new Set(prev).add(typeId)); // Punkt aufklappen
        toast.success(ok === 1 ? "Datei hochgeladen" : `${ok} Dateien hochgeladen`);
        router.refresh();
        onChanged?.();
      }
    } finally {
      setBusyType(null);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    // Dateien SNAPSHOTTEN, bevor der Input zurückgesetzt wird: `e.target.value
    // = ""` leert die Live-FileList, auf die `e.target.files` nur verweist —
    // sonst wären es 0 Dateien und der Upload feuerte nie (Bug Call SJ).
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    const typeId = uploadTypeRef.current;
    uploadTypeRef.current = null;
    if (!files.length || !typeId) return;
    await uploadFiles(typeId, files);
  }

  async function download(f: DocFile) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(f.storage_path, 60);
    if (error || !data) {
      toast.error("Download nicht möglich.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function removeFile(f: DocFile) {
    if (!confirm(`Datei „${f.dateiname}" wirklich löschen?`)) return;
    const { error } = await supabase
      .from("contact_documents")
      .delete()
      .eq("id", f.id);
    if (error) {
      toast.error("Löschen fehlgeschlagen.");
      return;
    }
    await supabase.storage.from(BUCKET).remove([f.storage_path]);
    toast.success("Datei gelöscht");
    router.refresh();
    onChanged?.();
  }

  /** Alle Dateien des Kunden als ein ZIP (14.2). */
  async function downloadZip() {
    if (!alleDateien.length) return;
    setZipping(true);
    try {
      const used = new Set<string>();
      const entries: { name: string; data: Uint8Array }[] = [];
      for (const f of alleDateien) {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(f.storage_path, 120);
        if (error || !data) continue;
        const resp = await fetch(data.signedUrl);
        const buf = new Uint8Array(await resp.arrayBuffer());
        entries.push({ name: uniqueName(f.dateiname, used), data: buf });
      }
      if (!entries.length) {
        toast.error("Keine Dateien zum Herunterladen.");
        return;
      }
      const blob = buildZip(entries);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Kundenunterlagen.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("ZIP-Download fehlgeschlagen.");
    } finally {
      setZipping(false);
    }
  }

  return (
    <CollapsibleSection
      title="Dokumenten-Checkliste"
      description={`${vorhandenCount} von ${sichtbar.length} Dokumenten vorhanden`}
    >
      {/* Fortschritt (3.1) + ZIP-Download (14.2) */}
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
        {alleDateien.length > 0 && (
          <button
            type="button"
            onClick={downloadZip}
            disabled={zipping}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
          >
            {zipping ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileArchive className="h-3.5 w-3.5" />
            )}
            Alle als ZIP
          </button>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={onFile}
      />

      <div className="space-y-5">
        {gruppen.map((g) => (
          <div key={g}>
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {GRUPPEN_LABEL[g]}
            </p>
            <ul className="space-y-1">
              {sichtbar
                .filter((t) => t.gruppe === g)
                .map((t) => {
                  const dateien = filesByType[t.id] ?? [];
                  const busy = busyType === t.id;
                  const dragging = dragType === t.id;
                  return (
                    <li
                      key={t.id}
                      onDragOver={(e) => {
                        if (!DOKUMENT_UPLOAD_AKTIV) return;
                        e.preventDefault();
                        setDragType(t.id);
                      }}
                      onDragLeave={() => setDragType(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragType(null);
                        if (DOKUMENT_UPLOAD_AKTIV && e.dataTransfer.files.length)
                          void uploadFiles(t.id, e.dataTransfer.files);
                      }}
                      className={cn(
                        "rounded-md border px-2.5 py-2 transition-colors",
                        dragging
                          ? "border-primary bg-primary/5"
                          : "border-transparent",
                      )}
                    >
                      <div className="flex items-center gap-3 text-sm">
                        <Checkbox
                          checked={istVorhanden(t.id)}
                          disabled={pending || busy || dateien.length > 0}
                          onCheckedChange={(c) => toggle(t, c === true)}
                        />
                        {dateien.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => toggleType(t.id)}
                            aria-expanded={openTypes.has(t.id)}
                            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                          >
                            <ChevronDown
                              className={cn(
                                "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                                !openTypes.has(t.id) && "-rotate-90",
                              )}
                              aria-hidden
                            />
                            <span className="min-w-0 truncate text-muted-foreground">
                              {t.name}
                              <span className="ml-1.5 text-xs text-muted-foreground">
                                ({dateien.length})
                              </span>
                            </span>
                          </button>
                        ) : (
                          <span className="min-w-0 flex-1 pl-5 text-foreground">
                            {t.name}
                          </span>
                        )}
                        {DOKUMENT_UPLOAD_AKTIV && (
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => pickFile(t.id)}
                            title="Datei(en) anhängen"
                            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
                          >
                            {busy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : dateien.length > 0 ? (
                              <Plus className="h-3.5 w-3.5" />
                            ) : (
                              <Paperclip className="h-3.5 w-3.5" />
                            )}
                            {dateien.length > 0 ? "Weitere" : "Anhängen"}
                          </button>
                        )}
                      </div>
                      {/* Dateien je Punkt — aufklappbar, UNTEREINANDER (Wunsch
                          Lukas): mehrere je Punkt, jederzeit nachreichbar. */}
                      {dateien.length > 0 && openTypes.has(t.id) && (
                        <ul className="ml-7 mt-1.5 space-y-1">
                          {dateien.map((f) => (
                            <li
                              key={f.id}
                              className="flex items-center gap-3 rounded-md border border-border bg-background/50 px-3 py-2"
                            >
                              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm">
                                  {f.dateiname}
                                </div>
                                <div className="truncate text-xs tabular-nums text-muted-foreground">
                                  {formatBytes(f.groesse)}
                                  {f.created_at ? ` · ${formatDate(f.created_at)}` : ""}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => download(f)}
                                title="Herunterladen / Vorschau"
                                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeFile(f)}
                                title="Löschen"
                                className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:text-danger"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Mehrere Dateien je Punkt möglich · jederzeit nachreichbar · per Klick
        oder Drag &amp; Drop. Fehlende Dokumente blockieren keinen Deal.
      </p>
    </CollapsibleSection>
  );
}
