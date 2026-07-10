import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import {
  dealVolumen,
  dealEsteraUmsatz,
  dealBeraterProvision,
  type DealFinanz,
} from "@/lib/provision";
import { BeraterTable, type BeraterRow } from "./berater-table";

type Scope = "gesamt" | "immobilien" | "vv";

export default async function BeraterUebersichtPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS: Berater erhält nur sein eigenes Profil + eigene Kontakte/Deals; GF alles.
  const [{ data: profiles }, { data: contacts }, { data: deals }, { data: stages }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, vorname, nachname, rolle, vertriebler_stufe"),
      supabase.from("contacts").select("id, berater_id"),
      supabase
        .from("deals")
        .select(
          "berater_id, bereich, stage_id, kaufpreis, bws, factoring, provisionssatz, berater_anteil",
        ),
      supabase.from("pipeline_stages").select("id, is_won, is_lost"),
    ]);

  const sMap = new Map((stages ?? []).map((s) => [s.id, s]));
  const stufeMap = new Map(
    (profiles ?? []).map((p) => [p.id, Number(p.vertriebler_stufe ?? 0)]),
  );
  const isGf =
    (profiles ?? []).find((p) => p.id === user.id)?.rolle ===
    "geschaeftsfuehrung";
  // Gleiche Definition wie in den Dashboards (1.2): Umsatz = Provision —
  // GF sieht den Estera-Umsatz, ein Berater seine eigene Provision.
  const umsatzOf = (d: DealFinanz & { berater_id: string }) =>
    isGf
      ? dealEsteraUmsatz(d, stufeMap.get(d.berater_id))
      : dealBeraterProvision(d, stufeMap.get(d.berater_id));

  const mkBucket = () => ({ offene: 0, pipeline: 0, umsatz: 0 });
  // Ergebnisse je Berater STRIKT getrennt nach Immobilien und VV (Wunsch 10).
  const rows: BeraterRow[] = (profiles ?? []).map((p) => {
    const myDeals = (deals ?? []).filter((d) => d.berater_id === p.id);
    const kontakte = (contacts ?? []).filter((c) => c.berater_id === p.id)
      .length;
    const immo = mkBucket();
    const vv = mkBucket();
    for (const d of myDeals) {
      const s = sMap.get(d.stage_id);
      const bucket = d.bereich === "immobilien" ? immo : vv;
      if (s?.is_won) bucket.umsatz += umsatzOf(d);
      else if (!s?.is_lost) {
        bucket.offene += 1;
        bucket.pipeline += dealVolumen(d);
      }
    }
    return {
      id: p.id,
      name: `${p.vorname} ${p.nachname}`,
      istGf: p.rolle === "geschaeftsfuehrung",
      kontakte,
      immo,
      vv,
    };
  });

  const hatImmo = (deals ?? []).some((d) => d.bereich === "immobilien");
  const hatVv = (deals ?? []).some((d) => d.bereich === "vv");
  const optionen: Scope[] = [];
  if (hatImmo) optionen.push("immobilien");
  if (hatVv) optionen.push("vv");
  if (hatImmo && hatVv) optionen.push("gesamt");
  if (optionen.length === 0) optionen.push("gesamt");

  return (
    <>
      <Topbar
        title="Berater-Übersicht"
        subtitle="Kontakte, offene Deals, Pipeline und Umsatz je Berater — getrennt nach Immobilien und Vermögensverwaltung"
        backHref="/listen"
      />
      <div className="px-6 py-6">
        <BeraterTable rows={rows} isGf={isGf} optionen={optionen} />
      </div>
    </>
  );
}
