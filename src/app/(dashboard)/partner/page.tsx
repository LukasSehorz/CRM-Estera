import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { getImmoModus } from "@/lib/einstellungen";
import {
  dealBeraterProvision,
  dealOverheadFuerUpline,
  type DealFinanz,
} from "@/lib/provision";
import { rangFuerStufe } from "@/config/karriere";
import {
  DecisionTree,
  type TreeNode,
} from "@/components/structure/decision-tree";
import {
  PartnerView,
  type PartnerStats,
  type TeamMember,
  type TippgeberMember,
  type OverheadPosten,
} from "./partner-view";

type Bereich = "immobilien" | "vv";
type StageJoin = { is_won: boolean; is_lost: boolean };
type DealRow = {
  berater_id: string;
  bereich: string;
  kaufpreis: number | null;
  bws: number | null;
  factoring: boolean | null;
  vv_zahlart: string | null;
  ratierlich: boolean | null;
  provisionssatz: number | null;
  berater_anteil: number | null;
  tippgeber_satz: number | null;
  tippgeber_id: string | null;
  pipeline_stages: StageJoin | StageJoin[] | null;
};

function won(d: DealRow): boolean {
  const st = Array.isArray(d.pipeline_stages)
    ? (d.pipeline_stages[0] ?? null)
    : d.pipeline_stages;
  return st?.is_won ?? false;
}
function lost(d: DealRow): boolean {
  const st = Array.isArray(d.pipeline_stages)
    ? (d.pipeline_stages[0] ?? null)
    : d.pipeline_stages;
  return st?.is_lost ?? false;
}

/**
 * „Partner"-Bereich (Call SJ, Schritt D+E — überarbeitet): gamifizierter
 * Überblick der eigenen Struktur (KPIs), die Performance der eigenen Berater
 * (Level, Umsatz, Provision, Zielerreichung) und der Entscheidungsbaum. Keine
 * Anlege-Formulare (die stehen in der Team-Verwaltung).
 */
export default async function PartnerPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("id, vorname, nachname, rolle, vertriebler_stufe, immo_anteil_default")
    .eq("id", user.id)
    .single();
  if (!me || me.rolle === "backoffice") redirect("/dashboard");

  const immoModus = await getImmoModus();

  // RLS liefert nur eigene + Downline (mehrstufig); die GF sieht alles.
  const [
    { data: profiles },
    { data: tippgeber },
    { data: dealsRaw },
    { data: ziele },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, vorname, nachname, rolle, vertriebler_stufe, immo_anteil_default, parent_berater_id, aktiv",
      ),
    supabase.from("tippgeber").select("id, name, owner_id, provision_satz, bereiche"),
    supabase
      .from("deals")
      .select(
        "berater_id, bereich, kaufpreis, bws, factoring, vv_zahlart, ratierlich, provisionssatz, berater_anteil, tippgeber_satz, tippgeber_id, pipeline_stages!inner(is_won, is_lost)",
      ),
    supabase
      .from("berater_monatsziele")
      .select("berater_id, monatsziel_immobilien, monatsziel_vv"),
  ]);

  const deals = (dealsRaw ?? []) as unknown as DealRow[];
  const stufeOf = (id: string) =>
    Number(
      (profiles ?? []).find((p) => p.id === id)?.vertriebler_stufe ?? 0,
    );

  // Performance + Provision je Berater.
  const perfMap = new Map<
    string,
    { abschluesse: number; umsatz: number; pipeline: number; provision: number }
  >();
  for (const d of deals) {
    const vol =
      d.bereich === "immobilien" ? Number(d.kaufpreis ?? 0) : Number(d.bws ?? 0);
    const cur = perfMap.get(d.berater_id) ?? {
      abschluesse: 0,
      umsatz: 0,
      pipeline: 0,
      provision: 0,
    };
    if (won(d)) {
      cur.abschluesse += 1;
      cur.umsatz += vol;
      cur.provision += dealBeraterProvision(
        d as unknown as DealFinanz,
        stufeOf(d.berater_id),
        immoModus,
      );
    } else if (!lost(d)) {
      cur.pipeline += vol;
    }
    perfMap.set(d.berater_id, cur);
  }

  // Umsatz, den ein verwalteter Tippgeber eingebracht hat (3.3): Summe der
  // Volumina gewonnener Deals, die auf ihn verweisen.
  const tippgeberPerf = new Map<string, { umsatz: number; vermittelt: number }>();
  for (const d of deals) {
    if (!d.tippgeber_id || !won(d)) continue;
    const vol =
      d.bereich === "immobilien" ? Number(d.kaufpreis ?? 0) : Number(d.bws ?? 0);
    const cur = tippgeberPerf.get(d.tippgeber_id) ?? { umsatz: 0, vermittelt: 0 };
    cur.umsatz += vol;
    cur.vermittelt += 1;
    tippgeberPerf.set(d.tippgeber_id, cur);
  }

  const profNameMap = new Map(
    (profiles ?? []).map((p) => [p.id, `${p.vorname} ${p.nachname}`]),
  );

  const zielMap = new Map(
    (ziele ?? []).map((z) => [
      z.berater_id,
      Number(z.monatsziel_immobilien ?? 0) + Number(z.monatsziel_vv ?? 0),
    ]),
  );

  // Baum, gewurzelt beim angemeldeten Nutzer (GF: alle Berater darunter).
  const nodeMap = new Map<string, TreeNode>();
  for (const p of profiles ?? []) {
    const perf = perfMap.get(p.id);
    nodeMap.set(p.id, {
      id: p.id,
      name: `${p.vorname} ${p.nachname}`,
      kind: p.rolle === "geschaeftsfuehrung" ? "gf" : "berater",
      stufe:
        p.vertriebler_stufe == null
          ? undefined
          : String(Number(p.vertriebler_stufe)),
      immoAnteil:
        p.immo_anteil_default == null
          ? undefined
          : String(Number(p.immo_anteil_default)),
      perf: perf
        ? { abschluesse: perf.abschluesse, umsatz: perf.umsatz, pipeline: perf.pipeline }
        : undefined,
      // Klick auf den Namen im Baum → Berater-Drilldown (nur echte Berater).
      href:
        p.rolle === "geschaeftsfuehrung"
          ? undefined
          : `/dashboard/berater/${p.id}`,
      children: [],
    });
  }
  for (const p of profiles ?? []) {
    if (p.parent_berater_id && nodeMap.has(p.parent_berater_id)) {
      nodeMap.get(p.parent_berater_id)!.children.push(nodeMap.get(p.id)!);
    }
  }
  for (const t of tippgeber ?? []) {
    const owner = nodeMap.get(t.owner_id);
    if (owner) {
      const tp = tippgeberPerf.get(t.id);
      owner.children.push({
        id: t.id,
        name: t.name,
        kind: "tippgeber",
        provisionSatz:
          t.provision_satz == null ? undefined : String(Number(t.provision_satz)),
        bereiche: (t.bereiche?.length ? t.bereiche : ["immobilien"]) as Bereich[],
        perf: tp
          ? { abschluesse: tp.vermittelt, umsatz: tp.umsatz, pipeline: 0 }
          : undefined,
        children: [],
      });
    }
  }
  const meNode = nodeMap.get(me.id);
  if (meNode && me.rolle === "geschaeftsfuehrung") {
    for (const p of profiles ?? []) {
      if (!p.parent_berater_id && p.id !== me.id)
        meNode.children.push(nodeMap.get(p.id)!);
    }
  }

  // Team-Liste (Berater in der eigenen Struktur).
  const team: TeamMember[] = (profiles ?? [])
    .filter((p) => p.id !== me.id && p.rolle !== "geschaeftsfuehrung")
    .map((p) => {
      const perf = perfMap.get(p.id);
      const stufe = Number(p.vertriebler_stufe ?? 0);
      return {
        id: p.id,
        name: `${p.vorname} ${p.nachname}`,
        level: rangFuerStufe(stufe).rang,
        stufe,
        abschluesse: perf?.abschluesse ?? 0,
        umsatz: perf?.umsatz ?? 0,
        provision: perf?.provision ?? 0,
        ziel: zielMap.get(p.id) ?? 0,
      };
    })
    .sort((a, b) => b.umsatz - a.umsatz);

  // Overhead aus DIREKTEN Partnern — je Person aufgeschlüsselt (KPI-Klick).
  const directChildren = (profiles ?? []).filter(
    (p) => p.parent_berater_id === me.id,
  );
  const meStufe = Number(me.vertriebler_stufe ?? 0);
  const meImmo =
    me.immo_anteil_default == null ? null : Number(me.immo_anteil_default);
  let overheadGesamt = 0;
  const overheadBreakdown: OverheadPosten[] = directChildren
    .map((child) => {
      let betrag = 0;
      for (const d of deals) {
        if (d.berater_id !== child.id || !won(d)) continue;
        betrag += dealOverheadFuerUpline(
          d as unknown as DealFinanz,
          meStufe,
          meImmo,
          Number(child.vertriebler_stufe ?? 0),
          immoModus,
        );
      }
      overheadGesamt += betrag;
      return { name: `${child.vorname} ${child.nachname}`, betrag };
    })
    .filter((r) => r.betrag > 0)
    .sort((a, b) => b.betrag - a.betrag);

  // Bester Partner = wer bislang am meisten Umsatz eingebracht hat.
  const besterName = team.length && team[0].umsatz > 0 ? team[0].name : "";

  // Tippgeber als eigener Team-Bereich, mit eingebrachtem Umsatz.
  const tippgeberTeam: TippgeberMember[] = (tippgeber ?? [])
    .map((t) => {
      const tp = tippgeberPerf.get(t.id);
      return {
        id: t.id,
        name: t.name,
        ownerName: profNameMap.get(t.owner_id) ?? "—",
        satz: t.provision_satz == null ? 0 : Number(t.provision_satz),
        umsatz: tp?.umsatz ?? 0,
        vermittelt: tp?.vermittelt ?? 0,
      };
    })
    .sort((a, b) => b.umsatz - a.umsatz);

  const stats: PartnerStats = {
    partnerCount: team.length,
    tippgeberCount: (tippgeber ?? []).length,
    overhead: overheadGesamt,
    bester: besterName,
  };

  return (
    <>
      <Topbar
        title="Partner"
        subtitle="Deine Struktur — Berater, Tippgeber & Overhead"
      />
      <div className="space-y-6 px-6 py-6">
        <PartnerView
          stats={stats}
          team={team}
          tippgeberTeam={tippgeberTeam}
          overheadBreakdown={overheadBreakdown}
        />

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-base font-semibold">Mein Organigramm</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Deine Struktur als Baum. Fahre über einen Knoten — der Pfad leuchtet
            auf, der Rest tritt zurück. Auf einen Knoten klicken zoomt auf den
            Ast; ein Klick auf den Berater-Namen öffnet dessen Details.
          </p>
          {meNode ? (
            <DecisionTree root={meNode} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Keine Struktur gefunden.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
