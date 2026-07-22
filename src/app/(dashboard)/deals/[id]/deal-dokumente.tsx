import { createClient } from "@/lib/supabase/server";
import { DocumentChecklist, type DocType } from "../../kontakte/document-checklist";
import { groupDocsByType } from "@/lib/dokumente";

/**
 * Kundenunterlagen direkt am Deal (Call SJ): dieselbe universelle Dokumenten-
 * Checkliste wie in der Kundenakte, bezogen auf den verknüpften Kunden. Nur für
 * Immobilien-Deals (VV braucht keine Unterlagen-Checkliste, Call 31:51).
 */
export async function DealDokumente({
  contactId,
  bereich,
}: {
  contactId: string;
  bereich: "immobilien" | "vv";
}) {
  if (bereich !== "immobilien") return null;

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
          "id, dateiname, anzeigename, storage_path, kategorie, document_type_id, groesse, created_at",
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

  const sichtbareTypes = (docTypes ?? []) as DocType[];
  const vorhandenMap: Record<string, boolean> = {};
  for (const s of docStatus ?? []) vorhandenMap[s.document_type_id] = s.vorhanden;

  const filesByType = groupDocsByType(
    (docs ?? []).map((d) => ({
      id: d.id,
      dateiname: d.dateiname,
      anzeigename: d.anzeigename,
      storage_path: d.storage_path,
      groesse: d.groesse,
      created_at: d.created_at,
      document_type_id: d.document_type_id,
      kategorie: d.kategorie,
    })),
    sichtbareTypes,
  );

  return (
    <DocumentChecklist
      contactId={contactId}
      istSelbststaendig={contact?.ist_selbststaendig ?? false}
      istImmobilienbesitzer={contact?.ist_immobilienbesitzer ?? false}
      types={sichtbareTypes}
      vorhanden={vorhandenMap}
      filesByType={filesByType}
    />
  );
}
