"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";

type Result = { ok: true } | { error: string };
const ERR = "Speichern fehlgeschlagen. Bitte erneut versuchen.";

/** Wie viele Dokumente dieses Kunden sind dem Finanzierer aktuell freigegeben? */
async function anzahlFreigaben(
  supabase: Awaited<ReturnType<typeof createClient>>,
  contactId: string,
  finanziererId: string,
): Promise<number> {
  const { data: docs } = await supabase
    .from("contact_documents")
    .select("id")
    .eq("contact_id", contactId);
  const ids = (docs ?? []).map((d) => d.id);
  if (ids.length === 0) return 0;
  const { count } = await supabase
    .from("document_freigaben")
    .select("id", { count: "exact", head: true })
    .eq("finanzierer_id", finanziererId)
    .in("document_id", ids);
  return count ?? 0;
}

async function benachrichtige(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  finanziererId: string,
  kundenName: string,
) {
  await createNotification(supabase, {
    empfaengerId: finanziererId,
    erzeugtVon: userId,
    typ: "dokument",
    titel: "Dokumente freigeschaltet",
    text: `Kunde ${kundenName}`,
    link: "/finanzierer",
  });
}

/** Ein einzelnes Dokument für einen Finanzierer freigeben/entziehen (nur GF). */
export async function setDokumentFreigabe(input: {
  documentId: string;
  finanziererId: string;
  frei: boolean;
  contactId: string;
  kundenName: string;
}): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  if (input.frei) {
    const vorher = await anzahlFreigaben(
      supabase,
      input.contactId,
      input.finanziererId,
    );
    const { error } = await supabase.from("document_freigaben").upsert(
      {
        document_id: input.documentId,
        finanzierer_id: input.finanziererId,
        freigegeben_von: user.id,
      },
      // Bei bestehender Freigabe nichts tun (kein UPDATE — dafür gibt es keine
      // RLS-Policy; die Freigabe muss ohnehin nicht geändert werden).
      { onConflict: "document_id,finanzierer_id", ignoreDuplicates: true },
    );
    if (error) return { error: ERR };
    // Erste Freigabe für diesen Kunden -> eine Benachrichtigung.
    if (vorher === 0)
      await benachrichtige(supabase, user.id, input.finanziererId, input.kundenName);
  } else {
    const { error } = await supabase
      .from("document_freigaben")
      .delete()
      .eq("document_id", input.documentId)
      .eq("finanzierer_id", input.finanziererId);
    if (error) return { error: ERR };
  }
  revalidatePath(`/kontakte/${input.contactId}`);
  return { ok: true };
}

/** Alle Dokumente eines Kunden auf einmal freigeben/entziehen (nur GF). */
export async function setAlleFreigaben(input: {
  contactId: string;
  finanziererId: string;
  documentIds: string[];
  frei: boolean;
  kundenName: string;
}): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  if (input.documentIds.length === 0) return { ok: true };

  if (input.frei) {
    const vorher = await anzahlFreigaben(
      supabase,
      input.contactId,
      input.finanziererId,
    );
    const { error } = await supabase.from("document_freigaben").upsert(
      input.documentIds.map((documentId) => ({
        document_id: documentId,
        finanzierer_id: input.finanziererId,
        freigegeben_von: user.id,
      })),
      // Bereits freigegebene Dokumente überspringen (kein UPDATE nötig).
      { onConflict: "document_id,finanzierer_id", ignoreDuplicates: true },
    );
    if (error) return { error: ERR };
    if (vorher === 0)
      await benachrichtige(supabase, user.id, input.finanziererId, input.kundenName);
  } else {
    const { error } = await supabase
      .from("document_freigaben")
      .delete()
      .eq("finanzierer_id", input.finanziererId)
      .in("document_id", input.documentIds);
    if (error) return { error: ERR };
  }
  revalidatePath(`/kontakte/${input.contactId}`);
  return { ok: true };
}
