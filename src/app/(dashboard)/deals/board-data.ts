import { createClient } from "@/lib/supabase/server";
import { computeDealHealth, tageSeit } from "@/lib/health";
import type { BoardDeal, BoardStage, Bereich } from "./deal-card";

/**
 * Lädt Phasen + Deals eines Bereichs für ein Kanban-Board. Die RLS sorgt
 * dafür, dass ein Berater nur eigene Deals erhält; die GF sieht alle.
 * Zusätzlich je Deal: Dokumenten-Fortschritt (3.1, nur Immobilien),
 * Deal-Age in der Phase (4.4) und die Health-Ampel (4.5).
 */
export async function loadBoard(bereich: Bereich): Promise<{
  stages: BoardStage[];
  deals: BoardDeal[];
  beraterMap: Record<string, string>;
  error: boolean;
}> {
  const supabase = await createClient();
  const now = new Date();

  const { data: stages, error: stagesErr } = await supabase
    .from("pipeline_stages")
    .select("id, name, position, wahrscheinlichkeit, is_won, is_lost, sla_tage")
    .eq("bereich", bereich)
    .order("position");

  const { data: deals, error: dealsErr } = await supabase
    .from("deals")
    .select(
      "id, dealname, berater_id, contact_id, stage_id, bereich, kaufpreis, objekt_adresse, objekt_status, bws, factoring, ratierlich, tippgeber, naechster_termin, updated_at",
    )
    .eq("bereich", bereich)
    .order("created_at", { ascending: false });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, vorname, nachname");
  const beraterMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, `${p.vorname} ${p.nachname}`]),
  );

  const dealIds = (deals ?? []).map((d) => d.id);
  const contactIds = [...new Set((deals ?? []).map((d) => d.contact_id))];

  // Zusatzdaten für Ampel + Dokumenten-Badge parallel laden
  const [
    { data: offeneHistorie },
    { data: offeneTasksKontakt },
    { data: offeneTasksDeal },
    { data: aktivitaeten },
    { data: types },
    { data: status },
    { data: contacts },
  ] = await Promise.all([
    dealIds.length
      ? supabase
          .from("deal_stage_history")
          .select("deal_id, entered_at")
          .in("deal_id", dealIds)
          .is("left_at", null)
      : Promise.resolve({ data: [] as { deal_id: string; entered_at: string }[] }),
    contactIds.length
      ? supabase
          .from("tasks")
          .select("contact_id")
          .eq("erledigt", false)
          .in("contact_id", contactIds)
      : Promise.resolve({ data: [] as { contact_id: string | null }[] }),
    dealIds.length
      ? supabase
          .from("tasks")
          .select("deal_id")
          .eq("erledigt", false)
          .in("deal_id", dealIds)
      : Promise.resolve({ data: [] as { deal_id: string | null }[] }),
    contactIds.length
      ? supabase
          .from("contact_activities")
          .select("contact_id, created_at")
          .in("contact_id", contactIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { contact_id: string; created_at: string }[] }),
    bereich === "immobilien"
      ? supabase.from("document_types").select("id, gruppe").eq("aktiv", true)
      : Promise.resolve({ data: [] as { id: string; gruppe: string }[] }),
    bereich === "immobilien" && contactIds.length
      ? supabase
          .from("contact_document_status")
          .select("contact_id, document_type_id, vorhanden")
          .in("contact_id", contactIds)
      : Promise.resolve({
          data: [] as { contact_id: string; document_type_id: string; vorhanden: boolean }[],
        }),
    bereich === "immobilien" && contactIds.length
      ? supabase
          .from("contacts")
          .select("id, ist_selbststaendig, ist_immobilienbesitzer")
          .in("id", contactIds)
      : Promise.resolve({
          data: [] as { id: string; ist_selbststaendig: boolean; ist_immobilienbesitzer: boolean }[],
        }),
  ]);

  const enteredMap = new Map(
    (offeneHistorie ?? []).map((h) => [h.deal_id, h.entered_at]),
  );
  const taskKontakte = new Set(
    (offeneTasksKontakt ?? []).map((t) => t.contact_id),
  );
  const taskDeals = new Set((offeneTasksDeal ?? []).map((t) => t.deal_id));
  const letzteAktivitaet = new Map<string, string>();
  for (const a of aktivitaeten ?? []) {
    if (!letzteAktivitaet.has(a.contact_id))
      letzteAktivitaet.set(a.contact_id, a.created_at); // absteigend sortiert
  }

  // Dokumenten-Fortschritt (nur Immobilien-Board)
  const doksByContact = new Map<string, { vorhanden: number; gesamt: number }>();
  if (bereich === "immobilien") {
    const typeGruppe = new Map((types ?? []).map((t) => [t.id, t.gruppe]));
    const anzahlJeGruppe: Record<string, number> = {
      allgemein: 0,
      selbststaendig: 0,
      immobilienbesitzer: 0,
    };
    for (const t of types ?? []) anzahlJeGruppe[t.gruppe] += 1;
    for (const c of contacts ?? []) {
      const gesamt =
        anzahlJeGruppe.allgemein +
        (c.ist_selbststaendig ? anzahlJeGruppe.selbststaendig : 0) +
        (c.ist_immobilienbesitzer ? anzahlJeGruppe.immobilienbesitzer : 0);
      const anwendbar = (g: string) =>
        g === "allgemein" ||
        (g === "selbststaendig" && c.ist_selbststaendig) ||
        (g === "immobilienbesitzer" && c.ist_immobilienbesitzer);
      const vorhanden = (status ?? []).filter(
        (s) =>
          s.contact_id === c.id &&
          s.vorhanden &&
          anwendbar(typeGruppe.get(s.document_type_id) ?? ""),
      ).length;
      doksByContact.set(c.id, { vorhanden, gesamt });
    }
  }

  const stageMap = new Map((stages ?? []).map((s) => [s.id, s]));
  const boardDeals: BoardDeal[] = (deals ?? []).map((d) => {
    const st = stageMap.get(d.stage_id);
    const doks = doksByContact.get(d.contact_id) ?? null;
    let health: BoardDeal["health"] = null;
    if (st && !st.is_won && !st.is_lost) {
      // Letzte Aktivität: jüngster Timeline-Eintrag des Kontakts, mindestens
      // aber die letzte Änderung am Deal selbst.
      const akt = letzteAktivitaet.get(d.contact_id);
      const aktTage = Math.min(
        tageSeit(akt, now) ?? Number.POSITIVE_INFINITY,
        tageSeit(d.updated_at, now) ?? Number.POSITIVE_INFINITY,
      );
      health = computeDealHealth({
        tageInPhase: tageSeit(enteredMap.get(d.id), now),
        slaTage: st.sla_tage == null ? null : Number(st.sla_tage),
        letzteAktivitaetTage: Number.isFinite(aktTage) ? aktTage : null,
        dokumenteFehlen: doks != null && doks.vorhanden < doks.gesamt,
        offeneAufgabe:
          taskDeals.has(d.id) || taskKontakte.has(d.contact_id),
      });
    }
    return { ...d, doks, health };
  });

  return {
    stages: (stages ?? []) as BoardStage[],
    deals: boardDeals,
    beraterMap,
    error: Boolean(stagesErr || dealsErr),
  };
}
