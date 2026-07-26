import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Zugriffsprotokoll für Kundendokumente (DSGVO Art. 5 Abs. 2, 30, 33).
 *
 * Ohne dieses Protokoll lässt sich weder eine Auskunft nach Art. 15
 * beantworten („welche Ihrer Unterlagen hat wer wann eingesehen?") noch eine
 * Datenpanne nach Art. 33 melden. Es erfasst bewusst NUR Metadaten — nie
 * Dateiinhalte.
 *
 * Geschrieben wird ausschließlich über die SECURITY-DEFINER-Funktion
 * `log_dokument_zugriff` (Migration 0032): sie trägt immer den ANGEMELDETEN
 * Nutzer ein, nie einen übergebenen Wert. Damit kann sich niemand als jemand
 * anderes protokollieren, und niemand kann Einträge nachträglich ändern oder
 * löschen — `authenticated` hat auf der Tabelle nur SELECT (und das nur GF).
 */
export type ZugriffAktion =
  | "upload"
  | "download"
  | "delete"
  | "zip_export"
  | "freigabe_erteilt"
  | "freigabe_entzogen";

type LogInput = {
  documentId?: string | null;
  contactId?: string | null;
  aktion: ZugriffAktion;
  dateiname?: string | null;
};

/**
 * Protokolliert einen Dokumentzugriff. Wirft NIE — ein fehlgeschlagenes
 * Protokoll darf den fachlichen Vorgang (Download, Upload) nicht blockieren.
 * Fehler landen in der Server-Konsole, damit ein dauerhaft kaputtes Protokoll
 * beim Betrieb auffällt.
 */
export async function logDokumentZugriff(
  supabase: SupabaseClient<Database>,
  { documentId, contactId, aktion, dateiname }: LogInput,
): Promise<void> {
  try {
    const { error } = await supabase.rpc("log_dokument_zugriff", {
      p_document_id: documentId ?? null,
      p_contact_id: contactId ?? null,
      p_aktion: aktion,
      p_dateiname: dateiname ?? null,
    });
    if (error) console.error("Zugriffsprotokoll fehlgeschlagen:", error.message);
  } catch (e) {
    console.error("Zugriffsprotokoll fehlgeschlagen:", e);
  }
}
