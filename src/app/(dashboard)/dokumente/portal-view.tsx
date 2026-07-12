"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Download,
  FileText,
  FolderOpen,
  Loader2,
  Lock,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { formatBytes, formatDate } from "@/lib/format";
import { bereichLabel } from "@/config/enums";
import { Input } from "@/components/ui/input";

export type PortalDoc = {
  id: string;
  titel: string;
  dateiname: string;
  storage_path: string;
  bereich: "immobilien" | "vv" | null;
  groesse: number | null;
};

export type KundenDoc = {
  id: string;
  dateiname: string;
  storage_path: string;
  kategorie: string;
  groesse: number | null;
  created_at: string;
  contactId: string;
  kundenname: string;
};

const KUNDEN_BUCKET = "kundendokumente";
const PORTAL_BUCKET = "vorlagen";
const MAX_BYTES = 25 * 1024 * 1024;

type Tab = "vorlagen" | "kunden" | "intern";

function safeName(name: string): string {
  return name.normalize("NFKD").replace(/[^\w.\-]+/g, "_").slice(-120);
}

export function PortalView({
  isGf,
  vorlagen,
  intern,
  kunden,
}: {
  isGf: boolean;
  vorlagen: PortalDoc[];
  intern: PortalDoc[];
  kunden: KundenDoc[];
}) {
  const [tab, setTab] = useState<Tab>("vorlagen");

  const tabs: { key: Tab; label: string; icon: typeof FileText; count: number }[] = [
    { key: "vorlagen", label: "Vorlagen", icon: FileText, count: vorlagen.length },
    { key: "kunden", label: "Kundenunterlagen", icon: Users, count: kunden.length },
    ...(isGf
      ? [{ key: "intern" as Tab, label: "Interne Dokumente", icon: Lock, count: intern.length }]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Tab-Leiste */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

      {tab === "vorlagen" && (
        <PortalLibrary
          docs={vorlagen}
          isGf={isGf}
          sichtbarkeit="vorlage"
          leerText="Noch keine Vorlagen hinterlegt."
          hinweis="Vorlagen (Selbstauskunft, Reservierungsvereinbarung, Leitfäden …) — für alle Vertriebspartner sichtbar."
        />
      )}
      {tab === "kunden" && <KundenListe docs={kunden} />}
      {tab === "intern" && isGf && (
        <PortalLibrary
          docs={intern}
          isGf={isGf}
          sichtbarkeit="intern"
          leerText="Noch keine internen Dokumente hinterlegt."
          hinweis="Nur für die Geschäftsführung: Verträge, Provisionsvereinbarungen, Preislisten, Vergütungspläne."
        />
      )}
    </div>
  );
}

/** Vorlagen-/Intern-Bibliothek: Liste + GF-Upload/Löschen. */
function PortalLibrary({
  docs,
  isGf,
  sichtbarkeit,
  leerText,
  hinweis,
}: {
  docs: PortalDoc[];
  isGf: boolean;
  sichtbarkeit: "vorlage" | "intern";
  leerText: string;
  hinweis: string;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [bereich, setBereich] = useState<"immobilien" | "vv" | "">("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    e.target.value = "";
    if (!files?.length) return;
    setBusy(true);
    let ok = 0;
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_BYTES) {
          toast.error(`„${file.name}" ist zu groß (max. 25 MB).`);
          continue;
        }
        const path = `${sichtbarkeit}/${crypto.randomUUID()}_${safeName(file.name)}`;
        const { error: upErr } = await supabase.storage
          .from(PORTAL_BUCKET)
          .upload(path, file, {
            upsert: false,
            contentType: file.type || undefined,
          });
        if (upErr) {
          toast.error(`Upload von „${file.name}" fehlgeschlagen.`);
          continue;
        }
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error: insErr } = await supabase.from("portal_documents").insert({
          titel: file.name.replace(/\.[^.]+$/, ""),
          dateiname: file.name,
          storage_path: path,
          sichtbarkeit,
          bereich: bereich || null,
          groesse: file.size,
          uploaded_by: user?.id ?? null,
        });
        if (insErr) {
          await supabase.storage.from(PORTAL_BUCKET).remove([path]);
          toast.error(`„${file.name}" konnte nicht gespeichert werden.`);
          continue;
        }
        ok++;
      }
      if (ok > 0) {
        toast.success(ok === 1 ? "Dokument hochgeladen" : `${ok} Dokumente hochgeladen`);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  async function download(d: PortalDoc) {
    const { data, error } = await supabase.storage
      .from(PORTAL_BUCKET)
      .createSignedUrl(d.storage_path, 120);
    if (error || !data) {
      toast.error("Download nicht möglich.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  async function remove(d: PortalDoc) {
    if (!confirm(`„${d.titel}" wirklich löschen?`)) return;
    const { error } = await supabase.from("portal_documents").delete().eq("id", d.id);
    if (error) {
      toast.error("Löschen fehlgeschlagen.");
      return;
    }
    await supabase.storage.from(PORTAL_BUCKET).remove([d.storage_path]);
    toast.success("Dokument gelöscht");
    router.refresh();
  }

  // Nach Bereich gruppieren (Immobilien / VV / Allgemein).
  const gruppen: { key: string; label: string; items: PortalDoc[] }[] = [
    { key: "immobilien", label: "Immobilien", items: docs.filter((d) => d.bereich === "immobilien") },
    { key: "vv", label: "Vermögensverwaltung", items: docs.filter((d) => d.bereich === "vv") },
    { key: "allgemein", label: "Allgemein", items: docs.filter((d) => !d.bereich) },
  ].filter((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{hinweis}</p>

      {isGf && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-surface-2 p-3">
          <input ref={fileRef} type="file" multiple className="hidden" onChange={onFile} />
          <span className="text-sm text-muted-foreground">Bereich:</span>
          {(["", "immobilien", "vv"] as const).map((b) => (
            <button
              key={b || "allg"}
              type="button"
              onClick={() => setBereich(b)}
              className={cn(
                "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                bereich === b
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {b === "" ? "Allgemein" : bereichLabel(b)}
            </button>
          ))}
          <button
            type="button"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Hochladen
          </button>
        </div>
      )}

      {docs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <FolderOpen className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{leerText}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {gruppen.map((g) => (
            <div key={g.key}>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {g.label}
              </p>
              <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {g.items.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.titel}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {d.dateiname} · {formatBytes(d.groesse)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => download(d)}
                      title="Herunterladen"
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                    {isGf && (
                      <button
                        type="button"
                        onClick={() => remove(d)}
                        title="Löschen"
                        className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Kundenunterlagen: alle hochgeladenen Kundendokumente, durchsuchbar. */
function KundenListe({ docs }: { docs: KundenDoc[] }) {
  const supabase = useMemo(() => createClient(), []);
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return docs;
    return docs.filter(
      (d) =>
        d.kundenname.toLowerCase().includes(needle) ||
        d.dateiname.toLowerCase().includes(needle) ||
        d.kategorie.toLowerCase().includes(needle),
    );
  }, [docs, q]);

  async function download(d: KundenDoc) {
    const { data, error } = await supabase.storage
      .from(KUNDEN_BUCKET)
      .createSignedUrl(d.storage_path, 60);
    if (error || !data) {
      toast.error("Download nicht möglich.");
      return;
    }
    window.open(data.signedUrl, "_blank");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Nach Kunde, Datei oder Kategorie suchen …"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:max-w-sm"
        />
        <span className="text-sm text-muted-foreground sm:ml-auto">
          {rows.length} {rows.length === 1 ? "Dokument" : "Dokumente"}
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface px-6 py-12 text-center">
          <FolderOpen className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Keine Kundenunterlagen gefunden.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-surface">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="px-4 py-3 font-medium">Kunde</th>
                <th className="px-4 py-3 font-medium">Dokument</th>
                <th className="px-4 py-3 font-medium">Kategorie</th>
                <th className="px-4 py-3 font-medium">Datum</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/kontakte/${d.contactId}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {d.kundenname}
                    </Link>
                  </td>
                  <td className="max-w-[240px] truncate px-4 py-3 text-muted-foreground">
                    {d.dateiname}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{d.kategorie}</td>
                  <td className="px-4 py-3 tabular-nums text-muted-foreground">
                    {formatDate(d.created_at)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => download(d)}
                      title="Herunterladen"
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
