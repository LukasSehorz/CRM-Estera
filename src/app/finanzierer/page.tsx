import { createClient } from "@/lib/supabase/server";
import { FinanziererView, type FinKunde } from "./finanzierer-view";

/**
 * Finanzierer-Startseite: Liste der Kunden (nur Name), zu denen Dokumente
 * freigeschaltet wurden. Aufklappen zeigt die freigegebenen Dokumente.
 */
export default async function FinanziererPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("finanzierer_kunden");
  const kunden: FinKunde[] = (data ?? []).map((k) => ({
    contactId: k.contact_id,
    name: k.name,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Freigegebene Dokumente
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hier sehen Sie die Kunden und Dokumente, die für Sie freigeschaltet
          wurden. Zum Ansehen einen Kunden aufklappen.
        </p>
      </div>
      <FinanziererView kunden={kunden} />
    </div>
  );
}
