import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/**
 * Erzeugt eine In-App-Benachrichtigung (Kunden-Feedback 22.07.). Wird als
 * Nebeneffekt beim Zuweisen von Aufgaben und beim Freischalten von Dokumenten
 * genutzt. `erzeugtVon` muss die eigene ID sein (RLS-Check). Selbst-
 * Benachrichtigungen werden übersprungen.
 */
export async function createNotification(
  supabase: Client,
  params: {
    empfaengerId: string;
    erzeugtVon: string;
    typ?: "aufgabe" | "dokument" | "info";
    titel: string;
    text?: string | null;
    link?: string | null;
  },
): Promise<void> {
  if (!params.empfaengerId || params.empfaengerId === params.erzeugtVon) return;
  await supabase.from("notifications").insert({
    empfaenger_id: params.empfaengerId,
    erzeugt_von: params.erzeugtVon,
    typ: params.typ ?? "info",
    titel: params.titel,
    text: params.text ?? null,
    link: params.link ?? null,
  });
}
