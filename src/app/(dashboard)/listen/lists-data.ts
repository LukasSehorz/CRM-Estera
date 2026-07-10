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
  beraterId: string;
  berater: string;
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
          "id, contact_id, dealname, bereich, stage_id, kaufpreis, bws, factoring, notartermin, naechster_termin, closed_at, created_at, berater_id",
        ),
      supabase
        .from("pipeline_stages")
        .select("id, name, position, is_won, is_lost, wahrscheinlichkeit"),
      supabase.from("profiles").select("id, vorname, nachname"),
    ]);

  const sMap = new Map((stages ?? []).map((s) => [s.id, s]));
  const pMap = new Map(
    (profiles ?? []).map((p) => [p.id, `${p.vorname} ${p.nachname}`]),
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
      beraterId: d.berater_id,
      berater: pMap.get(d.berater_id) ?? "—",
      notartermin: d.notartermin,
      naechsterTermin: d.naechster_termin,
      closedAt: d.closed_at,
      createdAt: d.created_at,
    };
  });
}

/** Offene Deals = nicht gewonnen und nicht verloren. */
export const isOffen = (d: DealRow) => !d.isWon && !d.isLost;
