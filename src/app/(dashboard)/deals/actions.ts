"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AUTO_AUFGABEN_AKTIV, TASK_TEMPLATES } from "@/config/task-templates";
import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

/**
 * Auto-Aufgaben je Statuswechsel (Schleife 2, 5.1): erzeugt die Vorlagen der
 * Zielphase für den Deal-Berater. Best effort — ein Fehler hier darf den
 * Phasenwechsel selbst NIE scheitern lassen. Bereits vorhandene offene
 * Aufgaben mit gleichem Titel am Deal werden übersprungen (kein Duplikat
 * beim Hin- und Herschieben).
 */
async function createAutoTasks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  deal: {
    id: string;
    contact_id: string;
    berater_id: string;
    bereich: Enums["bereich_enum"];
  },
  stageId: string,
): Promise<void> {
  if (!AUTO_AUFGABEN_AKTIV) return;
  try {
    const { data: stage } = await supabase
      .from("pipeline_stages")
      .select("name")
      .eq("id", stageId)
      .maybeSingle();
    const templates = stage ? TASK_TEMPLATES[deal.bereich]?.[stage.name] : null;
    if (!templates?.length) return;

    const { data: vorhandene } = await supabase
      .from("tasks")
      .select("titel")
      .eq("deal_id", deal.id)
      .eq("erledigt", false);
    const offen = new Set((vorhandene ?? []).map((t) => t.titel));

    const heute = new Date();
    const rows = templates
      .filter((t) => !offen.has(t.titel))
      .map((t) => ({
        titel: t.titel,
        faellig_am:
          t.fristTage != null
            ? new Date(heute.getTime() + t.fristTage * 86_400_000)
                .toISOString()
                .slice(0, 10)
            : null,
        contact_id: deal.contact_id,
        deal_id: deal.id,
        owner_id: deal.berater_id,
      }));
    if (rows.length) {
      const { error: insErr } = await supabase.from("tasks").insert(rows);
      if (insErr) console.error("[auto-tasks] insert fehlgeschlagen:", insErr.message);
    }
  } catch (e) {
    // best effort (5.1) — der Phasenwechsel darf nie scheitern, aber der
    // Grund gehört ins Server-Log statt ins Nirwana.
    console.error("[auto-tasks] Fehler:", e);
  }
}

export type DealInput = {
  contact_id: string;
  bereich: Enums["bereich_enum"];
  dealname: string;
  stage_id: string;
  naechster_termin: string | null;
  bemerkungen: string | null;
  next_step: string | null;
  next_step_faellig: string | null;
  // Immobilien
  kaufpreis: number | null;
  objekt_adresse: string | null;
  objekt_status: Enums["objekt_status_enum"] | null;
  notartermin: string | null;
  provisionssatz: number | null;
  berater_anteil: number | null;
  // Vermögensverwaltung
  bws: number | null;
  sparbeitrag: number | null;
  anzahl_jahre: number | null;
  vv_zahlart: "factoring" | "ohne_factoring" | "ratierlich";
  tippgeber: string | null;
  tippgeber_satz: number | null;
};

export type ActionResult = { ok: true; id?: string } | { error: string };

const SAVE_ERROR =
  "Speichern fehlgeschlagen. Prüfe deine Eingaben und versuche es erneut.";

function boardPath(bereich: Enums["bereich_enum"]): string {
  return bereich === "immobilien" ? "/immobilien" : "/vermoegensverwaltung";
}

/**
 * Schreibt nur die Felder des jeweiligen Bereichs; die Felder des anderen
 * Bereichs werden bewusst auf null gesetzt, damit ein Immobilien-Deal keine
 * VV-Daten trägt und umgekehrt (sauberer Diskriminator).
 * `berater_anteil` ist hier bewusst NICHT enthalten: das Feld darf nur die
 * GF schreiben (DB-Trigger) und wird separat angehängt — sonst würde jedes
 * normale Speichern eines Beraters am Trigger scheitern.
 */
function bereichFields(v: DealInput) {
  // next_step gilt für beide Bereiche (3.4).
  const gemeinsam = {
    next_step: v.next_step,
    next_step_faellig: v.next_step_faellig,
  };
  if (v.bereich === "immobilien") {
    return {
      ...gemeinsam,
      kaufpreis: v.kaufpreis,
      objekt_adresse: v.objekt_adresse,
      objekt_status: v.objekt_status,
      notartermin: v.notartermin,
      provisionssatz: v.provisionssatz,
      bws: null,
      sparbeitrag: null,
      anzahl_jahre: null,
      vv_zahlart: null,
      factoring: false,
      deal_typ: null,
      ratierlich: null,
      tippgeber: null,
      tippgeber_satz: null,
    };
  }
  // factoring/ratierlich werden vom DB-Trigger sync_vv_zahlart aus der
  // Zahlart abgeleitet — hier nur vv_zahlart schreiben (7.1, single source).
  return {
    ...gemeinsam,
    kaufpreis: null,
    objekt_adresse: null,
    objekt_status: null,
    notartermin: null,
    provisionssatz: null,
    bws: v.bws,
    sparbeitrag: v.sparbeitrag,
    anzahl_jahre: v.anzahl_jahre,
    vv_zahlart: v.vv_zahlart,
    deal_typ: null,
    tippgeber: v.tippgeber,
    tippgeber_satz: v.tippgeber_satz,
  };
}

/** Berater-Anteil nur mitschreiben, wenn die GF speichert (Trigger sichert zusätzlich). */
async function beraterAnteilFor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  v: DealInput,
): Promise<{ berater_anteil?: number | null }> {
  const { data: me } = await supabase
    .from("profiles")
    .select("rolle")
    .eq("id", userId)
    .single();
  if (me?.rolle !== "geschaeftsfuehrung") return {};
  return { berater_anteil: v.bereich === "immobilien" ? v.berater_anteil : null };
}

function validate(v: DealInput): string | null {
  if (!v.contact_id) return "Bitte einen Kontakt verknüpfen.";
  if (!v.dealname.trim()) return "Bitte einen Dealnamen vergeben.";
  if (!v.stage_id) return "Bitte eine Phase wählen.";
  return null;
}

export async function createDeal(values: DealInput): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const problem = validate(values);
  if (problem) return { error: problem };

  // berater_id wird aus dem verknüpften Kontakt abgeleitet: der Deal gehört
  // demselben Berater wie der Kontakt. RLS lässt nur sichtbare Kontakte zu.
  const { data: contact } = await supabase
    .from("contacts")
    .select("berater_id")
    .eq("id", values.contact_id)
    .maybeSingle();
  if (!contact) return { error: "Kontakt nicht gefunden oder kein Zugriff." };

  // Phase muss zum Bereich des Deals gehören (Diskriminator absichern).
  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("bereich")
    .eq("id", values.stage_id)
    .maybeSingle();
  if (!stage || stage.bereich !== values.bereich)
    return { error: "Phase passt nicht zum Bereich." };

  const { data, error } = await supabase
    .from("deals")
    .insert({
      dealname: values.dealname.trim(),
      berater_id: contact.berater_id,
      contact_id: values.contact_id,
      bereich: values.bereich,
      stage_id: values.stage_id,
      naechster_termin: values.naechster_termin,
      bemerkungen: values.bemerkungen,
      ...bereichFields(values),
      ...(await beraterAnteilFor(supabase, user.id, values)),
    })
    .select("id")
    .single();

  if (error || !data) return { error: SAVE_ERROR };
  // Auto-Aufgaben, falls der Deal direkt in einer Phase mit Vorlagen startet
  await createAutoTasks(
    supabase,
    {
      id: data.id,
      contact_id: values.contact_id,
      berater_id: contact.berater_id,
      bereich: values.bereich,
    },
    values.stage_id,
  );
  revalidatePath(boardPath(values.bereich));
  return { ok: true, id: data.id };
}

export async function updateDeal(
  id: string,
  values: DealInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const problem = validate(values);
  if (problem) return { error: problem };

  // Bestehenden Deal laden (RLS): Bereich/Kontakt/Berater bleiben fix.
  const { data: existing } = await supabase
    .from("deals")
    .select("bereich, stage_id, contact_id, berater_id")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "Deal nicht gefunden oder kein Zugriff." };

  // Zielphase muss zum (unveränderlichen) Bereich des Deals gehören.
  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("bereich")
    .eq("id", values.stage_id)
    .maybeSingle();
  if (!stage || stage.bereich !== existing.bereich)
    return { error: "Phase passt nicht zum Bereich." };

  const v: DealInput = { ...values, bereich: existing.bereich };
  const { error } = await supabase
    .from("deals")
    .update({
      dealname: v.dealname.trim(),
      stage_id: v.stage_id,
      naechster_termin: v.naechster_termin,
      bemerkungen: v.bemerkungen,
      ...bereichFields(v),
      ...(await beraterAnteilFor(supabase, user.id, v)),
    })
    .eq("id", id);

  if (error) return { error: SAVE_ERROR };
  // Auto-Aufgaben nur bei echtem Phasenwechsel (5.1)
  if (existing.stage_id !== v.stage_id) {
    await createAutoTasks(
      supabase,
      {
        id,
        contact_id: existing.contact_id,
        berater_id: existing.berater_id,
        bereich: existing.bereich,
      },
      v.stage_id,
    );
  }
  revalidatePath(boardPath(existing.bereich));
  revalidatePath(`/deals/${id}`);
  return { ok: true, id };
}

/**
 * Phasenwechsel per Drag&Drop. Das eigentliche Fortschreiben der
 * deal_stage_history (alten Eintrag schließen, neuen öffnen, ggf. closed_at)
 * erledigt der DB-Trigger track_deal_stage automatisch. Hier wird zusätzlich
 * geprüft, dass die Zielphase NICHT aus einem anderen Bereich stammt.
 */
export async function moveDeal(
  dealId: string,
  newStageId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { data: deal } = await supabase
    .from("deals")
    .select("bereich, stage_id, contact_id, berater_id")
    .eq("id", dealId)
    .maybeSingle();
  if (!deal) return { error: "Deal nicht gefunden oder kein Zugriff." };
  if (deal.stage_id === newStageId) return { ok: true, id: dealId };

  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("bereich")
    .eq("id", newStageId)
    .maybeSingle();
  if (!stage) return { error: "Phase nicht gefunden." };
  if (stage.bereich !== deal.bereich)
    return { error: "Ein Deal kann nicht in eine Phase eines anderen Bereichs." };

  const { error } = await supabase
    .from("deals")
    .update({ stage_id: newStageId })
    .eq("id", dealId);

  if (error) return { error: SAVE_ERROR };
  // Auto-Aufgaben der Zielphase (5.1) — auch beim Drag & Drop
  await createAutoTasks(
    supabase,
    {
      id: dealId,
      contact_id: deal.contact_id,
      berater_id: deal.berater_id,
      bereich: deal.bereich,
    },
    newStageId,
  );
  revalidatePath(boardPath(deal.bereich));
  revalidatePath(`/deals/${dealId}`);
  return { ok: true, id: dealId };
}

export async function deleteDeal(id: string) {
  const supabase = await createClient();
  const { data: deal } = await supabase
    .from("deals")
    .select("bereich")
    .eq("id", id)
    .maybeSingle();
  await supabase.from("deals").delete().eq("id", id);
  const target = deal ? boardPath(deal.bereich) : "/immobilien";
  revalidatePath(target);
  redirect(target);
}
