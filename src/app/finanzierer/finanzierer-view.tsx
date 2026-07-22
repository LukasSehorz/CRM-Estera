"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Download, FileText, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { formatBytes, formatDate } from "@/lib/format";
import { dokumentAnzeigename } from "@/lib/dokumente";

export type FinKunde = { contactId: string; name: string };

type FinDoc = {
  id: string;
  dateiname: string;
  kategorie: string;
  storage_path: string;
  groesse: number | null;
  created_at: string;
};

const BUCKET = "kundendokumente";

export function FinanziererView({ kunden }: { kunden: FinKunde[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [offen, setOffen] = useState<string | null>(null);
  const [docsByKunde, setDocsByKunde] = useState<Record<string, FinDoc[]>>({});
  const [ladend, setLadend] = useState<string | null>(null);

  async function toggle(k: FinKunde) {
    if (offen === k.contactId) {
      setOffen(null);
      return;
    }
    setOffen(k.contactId);
    if (!docsByKunde[k.contactId]) {
      setLadend(k.contactId);
      const { data, error } = await supabase.rpc("finanzierer_dokumente", {
        p_contact_id: k.contactId,
      });
      setLadend(null);
      if (error) {
        toast.error("Dokumente konnten nicht geladen werden.");
        return;
      }
      setDocsByKunde((prev) => ({
        ...prev,
        [k.contactId]: (data ?? []) as FinDoc[],
      }));
    }
  }

  async function download(d: FinDoc) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(d.storage_path, 60);
    if (error || !data) {
      toast.error("Download nicht möglich.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  if (kunden.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
        <FileText className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Aktuell sind keine Dokumente für Sie freigeschaltet.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {kunden.map((k) => {
        const auf = offen === k.contactId;
        const docs = docsByKunde[k.contactId] ?? [];
        return (
          <li
            key={k.contactId}
            className="overflow-hidden rounded-xl border border-border bg-surface"
          >
            <button
              type="button"
              onClick={() => toggle(k)}
              aria-expanded={auf}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">
                {k.name}
              </span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                  auf && "rotate-180",
                )}
              />
            </button>
            {auf && (
              <div className="border-t border-border px-4 py-3">
                {ladend === k.contactId ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Lädt …
                  </p>
                ) : docs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Keine Dokumente.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {docs.map((d) => (
                      <li
                        key={d.id}
                        className="flex items-center gap-3 rounded-md border border-border bg-background/50 px-3 py-2"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm">
                            {dokumentAnzeigename(d.kategorie, d.dateiname)}
                          </div>
                          <div className="truncate text-xs tabular-nums text-muted-foreground">
                            {formatBytes(d.groesse)}
                            {d.created_at ? ` · ${formatDate(d.created_at)}` : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => download(d)}
                          title="Herunterladen / Ansehen"
                          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
