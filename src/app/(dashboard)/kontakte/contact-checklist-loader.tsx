"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { groupDocsByType } from "@/lib/dokumente";
import { DocumentChecklist, type DocType } from "./document-checklist";

type LoadedDoc = {
  id: string;
  dateiname: string;
  storage_path: string;
  kategorie: string;
  document_type_id: string | null;
  groesse: number | null;
  created_at: string;
};

/**
 * Lädt die Dokumenten-Checkliste eines Kunden CLIENTSEITIG — für Kontexte, in
 * denen der Kontakt existiert, aber nicht serverseitig vorgeladen wurde (z. B.
 * beim Anlegen eines neuen Immobilien-Deals: der Kontakt ist im Formular
 * gewählt). Uploads landen sofort beim Kunden; nach Änderungen wird neu geladen.
 */
export function ContactChecklistLoader({ contactId }: { contactId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [types, setTypes] = useState<DocType[]>([]);
  const [docs, setDocs] = useState<LoadedDoc[]>([]);
  const [status, setStatus] = useState<
    { document_type_id: string; vorhanden: boolean }[]
  >([]);
  const [flags, setFlags] = useState<{ selbst: boolean; immo: boolean }>({
    selbst: false,
    immo: false,
  });

  const load = useCallback(async () => {
    const [tRes, dRes, sRes, cRes] = await Promise.all([
      supabase
        .from("document_types")
        .select("id, gruppe, name, position")
        .eq("aktiv", true)
        .order("position"),
      supabase
        .from("contact_documents")
        .select(
          "id, dateiname, storage_path, kategorie, document_type_id, groesse, created_at",
        )
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false }),
      supabase
        .from("contact_document_status")
        .select("document_type_id, vorhanden")
        .eq("contact_id", contactId),
      supabase
        .from("contacts")
        .select("ist_selbststaendig, ist_immobilienbesitzer")
        .eq("id", contactId)
        .maybeSingle(),
    ]);
    setTypes((tRes.data ?? []) as DocType[]);
    setDocs((dRes.data ?? []) as LoadedDoc[]);
    setStatus(
      (sRes.data ?? []) as { document_type_id: string; vorhanden: boolean }[],
    );
    setFlags({
      selbst: cRes.data?.ist_selbststaendig ?? false,
      immo: cRes.data?.ist_immobilienbesitzer ?? false,
    });
    setLoading(false);
  }, [contactId, supabase]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface p-5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Unterlagen werden geladen …
      </div>
    );
  }

  const vorhanden: Record<string, boolean> = {};
  for (const s of status) vorhanden[s.document_type_id] = s.vorhanden;

  return (
    <DocumentChecklist
      contactId={contactId}
      istSelbststaendig={flags.selbst}
      istImmobilienbesitzer={flags.immo}
      types={types}
      vorhanden={vorhanden}
      filesByType={groupDocsByType(docs, types)}
      onChanged={load}
    />
  );
}
