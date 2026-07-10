"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

export type ContactInput = {
  vorname: string;
  nachname: string;
  email: string | null;
  telefon: string | null;
  berater_id: string | null;
  status: Enums["kontakt_status_enum"];
  termin_status: Enums["termin_status_enum"];
  leadquelle: Enums["leadquelle_enum"] | null;
  interesse: Enums["bereich_enum"][];
  nettoverdienst_monatlich: number | null;
  eigenkapital: number | null;
  finanzierungsrahmen_betrag: number | null;
  einschaetzung_erhalten: boolean;
  datum_einschaetzung: string | null;
  eingeschaetzter_betrag: number | null;
  einschaetzung_durch: string | null;
  einschaetzung_status: Enums["einschaetzung_status_enum"] | null;
  unterlagen_vollstaendig: boolean;
  fehlende_unterlagen: string | null;
  finanzierungsstatus: Enums["finanzierungsstatus_enum"];
  ist_selbststaendig: boolean;
  ist_immobilienbesitzer: boolean;
};

export type ActionResult = { ok: true; id?: string } | { error: string };

const SAVE_ERROR =
  "Speichern fehlgeschlagen. Prüfe deine Eingaben und versuche es erneut.";

/**
 * Berater dürfen Kontakte nur sich selbst zuweisen; nur die GF darf einen
 * anderen Berater wählen. Wird serverseitig erzwungen (zusätzlich zu RLS).
 */
async function resolveBeraterId(
  supabase: SupabaseClient<Database>,
  userId: string,
  requested: string | null,
): Promise<string> {
  const { data: me } = await supabase
    .from("profiles")
    .select("rolle")
    .eq("id", userId)
    .single();
  if (me?.rolle === "geschaeftsfuehrung" && requested) return requested;
  return userId;
}

function toRow(v: ContactInput) {
  return {
    vorname: v.vorname.trim(),
    nachname: v.nachname.trim(),
    email: v.email,
    telefon: v.telefon,
    status: v.status,
    termin_status: v.termin_status,
    leadquelle: v.leadquelle,
    interesse: v.interesse,
    nettoverdienst_monatlich: v.nettoverdienst_monatlich,
    eigenkapital: v.eigenkapital,
    finanzierungsrahmen_betrag: v.finanzierungsrahmen_betrag,
    einschaetzung_erhalten: v.einschaetzung_erhalten,
    datum_einschaetzung: v.datum_einschaetzung,
    eingeschaetzter_betrag: v.eingeschaetzter_betrag,
    einschaetzung_durch: v.einschaetzung_durch,
    einschaetzung_status: v.einschaetzung_status,
    unterlagen_vollstaendig: v.unterlagen_vollstaendig,
    fehlende_unterlagen: v.fehlende_unterlagen,
    finanzierungsstatus: v.finanzierungsstatus,
    ist_selbststaendig: v.ist_selbststaendig,
    ist_immobilienbesitzer: v.ist_immobilienbesitzer,
  };
}

export async function createContact(
  values: ContactInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  if (!values.vorname.trim() || !values.nachname.trim())
    return { error: "Vor- und Nachname sind erforderlich." };

  const berater_id = await resolveBeraterId(supabase, user.id, values.berater_id);
  const { data, error } = await supabase
    .from("contacts")
    .insert({ ...toRow(values), berater_id })
    .select("id")
    .single();

  if (error || !data) return { error: SAVE_ERROR };
  revalidatePath("/kontakte");
  return { ok: true, id: data.id };
}

export async function updateContact(
  id: string,
  values: ContactInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  if (!values.vorname.trim() || !values.nachname.trim())
    return { error: "Vor- und Nachname sind erforderlich." };

  const berater_id = await resolveBeraterId(supabase, user.id, values.berater_id);
  const { error } = await supabase
    .from("contacts")
    .update({ ...toRow(values), berater_id })
    .eq("id", id);

  if (error) return { error: SAVE_ERROR };
  revalidatePath("/kontakte");
  revalidatePath(`/kontakte/${id}`);
  return { ok: true, id };
}

export async function deleteContact(id: string) {
  const supabase = await createClient();
  await supabase.from("contacts").delete().eq("id", id);
  revalidatePath("/kontakte");
  redirect("/kontakte");
}

// ── Kundenakte (Schleife 2, Kap. 3) ─────────────────────────────────────

/** Checklisten-Haken „vorhanden/fehlt" je Dokumenttyp (3.1). */
export async function setDocumentStatus(
  contactId: string,
  documentTypeId: string,
  vorhanden: boolean,
  documentId?: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase.from("contact_document_status").upsert(
    {
      contact_id: contactId,
      document_type_id: documentTypeId,
      vorhanden,
      document_id: documentId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "contact_id,document_type_id" },
  );
  if (error) return { error: SAVE_ERROR };
  revalidatePath(`/kontakte/${contactId}`);
  revalidatePath("/immobilien"); // Fortschritts-Badge auf den Deal-Karten
  return { ok: true };
}

/** Manueller Timeline-Eintrag (3.5): Anruf, Mail, WhatsApp, Notiz. */
export async function addActivity(
  contactId: string,
  typ: Exclude<Enums["activity_typ_enum"], "system">,
  text: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  if (!text.trim()) return { error: "Bitte einen Text eingeben." };

  const { error } = await supabase.from("contact_activities").insert({
    contact_id: contactId,
    typ,
    text: text.trim(),
    created_by: user.id,
  });
  if (error) return { error: SAVE_ERROR };
  revalidatePath(`/kontakte/${contactId}`);
  return { ok: true };
}

/** Aufgabe anlegen (4.3 — Datenbasis; das Cockpit folgt in Phase 12). */
export async function addTask(input: {
  titel: string;
  faellig_am: string | null;
  contact_id?: string | null;
  deal_id?: string | null;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  if (!input.titel.trim()) return { error: "Bitte einen Titel eingeben." };

  const { error } = await supabase.from("tasks").insert({
    titel: input.titel.trim(),
    faellig_am: input.faellig_am,
    contact_id: input.contact_id ?? null,
    deal_id: input.deal_id ?? null,
    owner_id: user.id,
  });
  if (error) return { error: SAVE_ERROR };
  if (input.contact_id) revalidatePath(`/kontakte/${input.contact_id}`);
  return { ok: true };
}

export async function toggleTask(
  taskId: string,
  erledigt: boolean,
  contactId?: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ erledigt })
    .eq("id", taskId);
  if (error) return { error: SAVE_ERROR };
  if (contactId) revalidatePath(`/kontakte/${contactId}`);
  return { ok: true };
}

export async function deleteTask(
  taskId: string,
  contactId?: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { error: SAVE_ERROR };
  if (contactId) revalidatePath(`/kontakte/${contactId}`);
  return { ok: true };
}
