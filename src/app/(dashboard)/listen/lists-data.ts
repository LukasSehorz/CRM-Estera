import { createClient } from "@/lib/supabase/server";

export type DealRow = {
  id: string;
  contactId: string;
  dealname: string;
  bereich: "immobilien" | "vv";
  stageName: string;
  stagePos: number;
  isWon: boolean;
  isLost: boolean;
  wahrscheinlichkeit: number;
  kaufpreis: number | null;
  bws: number | null;
  factoring: boolean;
  vv_zahlart: string | null;
  ratierlich: boolean | null;
  tippgeber_satz: number | null;
  beraterId: string;
  berater: string;
  vertrieblerStufe: number;
  notartermin: string | null;
  naechsterTermin: string | null;
  closedAt: string | null;
  createdAt: string;
};

/** Lädt alle sichtbaren Deals (RLS) angereichert mit Phase + Berater. */
export async function loadDealRows(): Promise<DealRow[]> {
  const supabase = await createClient();
  const [{ data: deals }, { data: stages }, { data: profiles }] =
    await Promise.all([
      supabase
        .from("deals")
        .select(
          "id, contact_id, dealname, bereich, stage_id, kaufpreis, bws, factoring, vv_zahlart, ratierlich, tippgeber_satz, notartermin, naechster_termin, closed_at, created_at, berater_id",
        ),
      supabase
        .from("pipeline_stages")
        .select("id, name, position, is_won, is_lost, wahrscheinlichkeit"),
      supabase.from("profiles").select("id, vorname, nachname, vertriebler_stufe"),
    ]);

  const sMap = new Map((stages ?? []).map((s) => [s.id, s]));
  const pMap = new Map(
    (profiles ?? []).map((p) => [p.id, `${p.vorname} ${p.nachname}`]),
  );
  const stufeMap = new Map(
    (profiles ?? []).map((p) => [p.id, Number(p.vertriebler_stufe ?? 0)]),
  );

  return (deals ?? []).map((d) => {
    const s = sMap.get(d.stage_id);
    return {
      id: d.id,
      contactId: d.contact_id,
      dealname: d.dealname,
      bereich: d.bereich,
      stageName: s?.name ?? "—",
      stagePos: s?.position ?? 0,
      isWon: s?.is_won ?? false,
      isLost: s?.is_lost ?? false,
      wahrscheinlichkeit: s?.wahrscheinlichkeit ?? 0,
      kaufpreis: d.kaufpreis,
      bws: d.bws,
      factoring: d.factoring,
      vv_zahlart: d.vv_zahlart,
      ratierlich: d.ratierlich,
      tippgeber_satz: d.tippgeber_satz,
      beraterId: d.berater_id,
      berater: pMap.get(d.berater_id) ?? "—",
      vertrieblerStufe: stufeMap.get(d.berater_id) ?? 0,
      notartermin: d.notartermin,
      naechsterTermin: d.naechster_termin,
      closedAt: d.closed_at,
      createdAt: d.created_at,
    };
  });
}

/** Offene Deals = nicht gewonnen und nicht verloren. */
export const isOffen = (d: DealRow) => !d.isWon && !d.isLost;
