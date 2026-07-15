import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { PortalView, type PortalDoc, type KundenDoc } from "./portal-view";
import type { DocType } from "../kontakte/document-checklist";

type ContactJoin = {
  vorname: string;
  nachname: string;
  ist_selbststaendig: boolean | null;
  ist_immobilienbesitzer: boolean | null;
  interesse: string[] | null;
};

/**
 * Dokumentenportal (V4.1 Kap. 14) — eigener Hauptbereich der Sidebar:
 *   • Vorlagen (für alle Vertriebspartner, je Bereich getrennt)
 *   • Kundenunterlagen (alle hochgeladenen Kundendokumente, durchsuchbar)
 *   • Interne Dokumente (nur GF — Verträge, Preislisten, Vergütungspläne)
 * RLS setzt die Sichtbarkeit durch; „intern" laden wir nur für die GF.
 */
export default async function DokumentePortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("rolle")
    .eq("id", user.id)
    .single();
  const isGf = me?.rolle === "geschaeftsfuehrung";

  const [
    { data: portal },
    { data: kunden },
    { data: docStatus },
    { data: docTypes },
  ] = await Promise.all([
    supabase
      .from("portal_documents")
      .select("id, titel, dateiname, storage_path, sichtbarkeit, bereich, groesse, created_at")
      .order("created_at", { ascending: false }),
    supabase
      .from("contact_documents")
      .select(
        "id, dateiname, storage_path, kategorie, document_type_id, groesse, created_at, contact_id, contacts(vorname, nachname, ist_selbststaendig, ist_immobilienbesitzer, interesse)",
      )
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("contact_document_status")
      .select("contact_id, document_type_id, vorhanden"),
    supabase
      .from("document_types")
      .select("id, gruppe, name, position")
      .eq("aktiv", true)
      .order("position"),
  ]);

  const vorlagen: PortalDoc[] = (portal ?? [])
    .filter((d) => d.sichtbarkeit === "vorlage")
    .map((d) => ({
      id: d.id,
      titel: d.titel,
      dateiname: d.dateiname,
      storage_path: d.storage_path,
      bereich: d.bereich,
      groesse: d.groesse,
    }));
  const intern: PortalDoc[] = (portal ?? [])
    .filter((d) => d.sichtbarkeit === "intern")
    .map((d) => ({
      id: d.id,
      titel: d.titel,
      dateiname: d.dateiname,
      storage_path: d.storage_path,
      bereich: d.bereich,
      groesse: d.groesse,
    }));

  // Kundentyp/Interesse je Kontakt (für die Checkliste im Portal).
  const metaByContact: Record<
    string,
    { selbst: boolean; immo: boolean; istImmoKontakt: boolean }
  > = {};
  const kundenDocs: KundenDoc[] = (kunden ?? []).map((d) => {
    const k = d.contacts as unknown as ContactJoin | ContactJoin[] | null;
    const kontakt = Array.isArray(k) ? k[0] : k;
    if (kontakt && !metaByContact[d.contact_id]) {
      metaByContact[d.contact_id] = {
        selbst: kontakt.ist_selbststaendig ?? false,
        immo: kontakt.ist_immobilienbesitzer ?? false,
        istImmoKontakt: (kontakt.interesse ?? []).includes("immobilien"),
      };
    }
    return {
      id: d.id,
      dateiname: d.dateiname,
      storage_path: d.storage_path,
      kategorie: d.kategorie,
      documentTypeId: d.document_type_id,
      groesse: d.groesse,
      created_at: d.created_at,
      contactId: d.contact_id,
      kundenname: kontakt ? `${kontakt.vorname} ${kontakt.nachname}` : "—",
    };
  });

  // Checklisten-Status je Kontakt/Typ.
  const statusByContact: Record<string, Record<string, boolean>> = {};
  for (const s of docStatus ?? []) {
    (statusByContact[s.contact_id] ??= {})[s.document_type_id] = s.vorhanden;
  }

  return (
    <>
      <Topbar
        title="Dokumentenportal"
        subtitle="Vorlagen, Kundenunterlagen und interne Dokumente an einem Ort"
      />
      <div className="px-6 py-6">
        <PortalView
          isGf={isGf}
          vorlagen={vorlagen}
          intern={intern}
          kunden={kundenDocs}
          docTypes={(docTypes ?? []) as DocType[]}
          statusByContact={statusByContact}
          metaByContact={metaByContact}
        />
      </div>
    </>
  );
}
