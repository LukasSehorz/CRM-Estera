"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DOKUMENT_KATEGORIEN } from "@/config/enums";
import { CollapsibleSection } from "@/components/collapsible-section";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type DocRow = {
  id: string;
  dateiname: string;
  storage_path: string;
  kategorie: string;
  groesse: number | null;
  created_at: string;
};

const BUCKET = "kundendokumente";
const MAX_BYTES = 15 * 1024 * 1024;

function formatSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
// Dateinamen für den Storage-Pfad entschärfen (nur harmlose Zeichen).
function safeName(name: string): string {
  return name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").slice(-120);
}

export function ContactDocuments({
  contactId,
  documents,
}: {
  contactId: string;
  documents: DocRow[];
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [kategorie, setKategorie] = useState<string>(DOKUMENT_KATEGORIEN[0]);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // erneutes Wählen derselben Datei erlauben
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("Datei zu groß (max. 15 MB).");
      return;
    }
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
      const { error: insErr } = await supabase.from("contact_documents").insert({
        contact_id: contactId,
        dateiname: file.name,
        storage_path: path,
        kategorie,
        groesse: file.size,
        uploaded_by: user?.id ?? null,
      });
      if (insErr) {
        await supabase.storage.from(BUCKET).remove([path]); // Rollback
        throw insErr;
      }
      toast.success("Dokument hochgeladen");
      router.refresh();
    } catch {
      toast.error("Upload fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setBusy(false);
    }
  }

  async function download(doc: DocRow) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 60);
    if (error || !data) {
      toast.error("Download nicht möglich.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  function remove(doc: DocRow) {
    if (!confirm(`„${doc.dateiname}" wirklich löschen?`)) return;
    startTransition(async () => {
      const { error: delErr } = await supabase
        .from("contact_documents")
        .delete()
        .eq("id", doc.id);
      if (delErr) {
        toast.error("Löschen fehlgeschlagen.");
        return;
      }
      await supabase.storage.from(BUCKET).remove([doc.storage_path]);
      toast.success("Dokument gelöscht");
      router.refresh();
    });
  }

  return (
    <CollapsibleSection
      title="Dokumente"
      description="Gehaltsabrechnung, Selbstauskunft, Ausweis, Eigenkapitalnachweis …"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">Kategorie</span>
            <Select value={kategorie} onValueChange={setKategorie}>
              <SelectTrigger className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOKUMENT_KATEGORIEN.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={onFile}
          />
          <Button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-1 h-4 w-4" />
            )}
            Datei hochladen
          </Button>
        </div>

        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Dokumente hochgeladen.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {documents.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-3 py-2.5">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {d.dateiname}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {d.kategorie}
                    {d.groesse ? ` · ${formatSize(d.groesse)}` : ""} ·{" "}
                    {formatDate(d.created_at)}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Herunterladen"
                  onClick={() => download(d)}
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Löschen"
                  className="text-destructive hover:text-destructive"
                  onClick={() => remove(d)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">
          Sichtbar nur für den zuständigen Berater und die Geschäftsführung.
          Max. 15 MB je Datei.
        </p>
      </div>
    </CollapsibleSection>
  );
}
