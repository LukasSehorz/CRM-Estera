"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { Paperclip, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocType } from "./document-checklist";

const MAX_BYTES = 15 * 1024 * 1024;

const GRUPPEN_LABEL: Record<DocType["gruppe"], string> = {
  allgemein: "Allgemeine Unterlagen",
  selbststaendig: "Zusätzlich für Selbstständige",
  immobilienbesitzer: "Zusätzlich für Immobilienbesitzer",
};

export type StagedByType = Record<string, File[]>;

/**
 * Dokumenten-Checkliste im ANLEGE-Modus (Wunsch Lukas): dieselbe Struktur wie
 * in der Kundenakte, aber die Dateien werden nur zwischengespeichert und erst
 * nach dem Anlegen hochgeladen (dann existiert die Kontakt-ID). Mehrere Dateien
 * je Punkt, nebeneinander.
 */
export function StagedChecklist({
  types,
  istSelbststaendig,
  istImmobilienbesitzer,
  value,
  onChange,
}: {
  types: DocType[];
  istSelbststaendig: boolean;
  istImmobilienbesitzer: boolean;
  value: StagedByType;
  onChange: (next: StagedByType) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  // REF statt State (Race, siehe document-checklist): synchron gesetzt/gelesen.
  const uploadTypeRef = useRef<string | null>(null);

  const sichtbar = types.filter(
    (t) =>
      t.gruppe === "allgemein" ||
      (t.gruppe === "selbststaendig" && istSelbststaendig) ||
      (t.gruppe === "immobilienbesitzer" && istImmobilienbesitzer),
  );
  const gruppen = (
    ["allgemein", "selbststaendig", "immobilienbesitzer"] as const
  ).filter((g) => sichtbar.some((t) => t.gruppe === g));

  function pick(typeId: string) {
    uploadTypeRef.current = typeId;
    fileRef.current?.click();
  }
  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    // Snapshot vor dem Reset — sonst leert `e.target.value = ""` die FileList.
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    const typeId = uploadTypeRef.current;
    uploadTypeRef.current = null;
    if (!files.length || !typeId) return;
    const neu: File[] = [];
    for (const f of files) {
      if (f.size > MAX_BYTES) {
        toast.error(`„${f.name}" ist zu groß (max. 15 MB).`);
        continue;
      }
      neu.push(f);
    }
    if (!neu.length) return;
    onChange({ ...value, [typeId]: [...(value[typeId] ?? []), ...neu] });
  }
  function removeAt(typeId: string, idx: number) {
    const next = (value[typeId] ?? []).filter((_, i) => i !== idx);
    const clone = { ...value };
    if (next.length) clone[typeId] = next;
    else delete clone[typeId];
    onChange(clone);
  }

  const total = Object.values(value).reduce((s, arr) => s + arr.length, 0);

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={onFiles}
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
                  const dateien = value[t.id] ?? [];
                  return (
                    <li key={t.id} className="px-2.5 py-2">
                      <div className="flex items-center gap-3 text-sm">
                        <span
                          className={cn(
                            "min-w-0 flex-1",
                            dateien.length > 0
                              ? "text-muted-foreground"
                              : "text-foreground",
                          )}
                        >
                          {t.name}
                          {dateien.length > 0 && (
                            <span className="ml-1.5 text-xs text-muted-foreground">
                              ({dateien.length})
                            </span>
                          )}
                        </span>
                        <button
                          type="button"
                          onClick={() => pick(t.id)}
                          title="Datei(en) anhängen"
                          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                        >
                          {dateien.length > 0 ? (
                            <Plus className="h-3.5 w-3.5" />
                          ) : (
                            <Paperclip className="h-3.5 w-3.5" />
                          )}
                          {dateien.length > 0 ? "Weitere" : "Anhängen"}
                        </button>
                      </div>
                      {/* vorgemerkte Dateien — nebeneinander */}
                      {dateien.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {dateien.map((f, i) => (
                            <span
                              key={`${f.name}-${i}`}
                              className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 py-1 pl-2 pr-1 text-xs"
                            >
                              <span className="max-w-[180px] truncate text-foreground">
                                {f.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeAt(t.id, i)}
                                title="Entfernen"
                                className="rounded p-0.5 text-muted-foreground transition-colors hover:text-danger"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
            </ul>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {total > 0
          ? `${total} Datei${total === 1 ? "" : "en"} vorgemerkt · Upload nach dem Anlegen.`
          : "Mehrere Dateien je Punkt möglich · Upload nach dem Anlegen."}
      </p>
    </div>
  );
}
