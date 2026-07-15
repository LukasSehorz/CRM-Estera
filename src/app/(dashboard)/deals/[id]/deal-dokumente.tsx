import { createClient } from "@/lib/supabase/server";
import { ContactDocuments, type DocRow } from "../../kontakte/contact-documents";
import {
  DocumentChecklist,
  type DocFile,
  type DocType,
} from "../../kontakte/document-checklist";

/**
 * Kundenunterlagen direkt am Deal (Call SJ, Phase 1.4). Dokumente sind
 * kundenbezogen gespeichert — hier werden die Unterlagen des verknüpften
 * Kunden gezeigt: bei Immobilien die strukturierte Checkliste („Vorlage, was
 * hochzuladen ist"), für alle Bereiche der freie Uploader. So sind die
 * Unterlagen auch „unten am Deal" erreichbar, nicht nur in der Kundenakte.
 */
export async function DealDokumente({
  contactId,
  bereich,
}: {
  contactId: string;
  bereich: "immobilien" | "vv";
}) {
  const supabase = await createClient();

  const [{ data: contact }, { data: docs }, { data: docTypes }, { data: docStatus }] =
    await Promise.all([
      supabase
        .from("contacts")
        .select("ist_selbststaendig, ist_immobilienbesitzer")
        .eq("id", contactId)
        .maybeSingle(),
      supabase
        .from("contact_documents")
        .select(
          "id, dateiname, storage_path, kategorie, document_type_id, groesse, created_at",
        )
        .eq("contact_id", contactId)
        .order("created_at", { ascending: false }),
      supabase
        .from("document_types")
        .select("id, gruppe, name, position")
        .eq("aktiv", true)
        .order("position"),
      supabase
        .from("contact_document_status")
        .select("document_type_id, vorhanden, document_id")
        .eq("contact_id", contactId),
    ]);

  const vorhandenMap: Record<string, boolean> = {};
  for (const s of docStatus ?? []) vorhandenMap[s.document_type_id] = s.vorhanden;

  // Dateien je Dokumenttyp (mehrere je Typ).
  const filesByType: Record<string, DocFile[]> = {};
  for (const d of docs ?? []) {
    if (!d.document_type_id) continue;
    (filesByType[d.document_type_id] ??= []).push({
      id: d.id,
      dateiname: d.dateiname,
      storage_path: d.storage_path,
      groesse: d.groesse,
    });
  }
  const freieDocs = (docs ?? []).filter((d) => !d.document_type_id);
  // Die Finanzierungs-Checkliste ist nur für Immobilien-Deals sinnvoll (VV
  // braucht keine Kundenunterlagen-Checkliste — Call SJ 31:51).
  const zeigeChecklist = bereich === "immobilien";

  return (
    <div className="space-y-6">
      {zeigeChecklist && (
        <DocumentChecklist
          contactId={contactId}
          istSelbststaendig={contact?.ist_selbststaendig ?? false}
          istImmobilienbesitzer={contact?.ist_immobilienbesitzer ?? false}
          types={(docTypes ?? []) as DocType[]}
          vorhanden={vorhandenMap}
          filesByType={filesByType}
        />
      )}
      <ContactDocuments contactId={contactId} documents={freieDocs as DocRow[]} />
    </div>
  );
}
