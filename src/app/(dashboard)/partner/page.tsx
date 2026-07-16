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
        "berater_id, bereich, kaufpreis, bws, factoring, vv_zahlart, ratierlich, provisionssatz, berater_anteil, tippgeber_satz, pipeline_stages!inner(is_won, is_lost)",
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
    if (owner)
      owner.children.push({
        id: t.id,
        name: t.name,
        kind: "tippgeber",
        provisionSatz:
          t.provision_satz == null ? undefined : String(Number(t.provision_satz)),
        bereiche: (t.bereiche?.length ? t.bereiche : ["immobilien"]) as Bereich[],
        children: [],
      });
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

  // Kennzahlen inkl. Overhead aus DIREKTEN Partnern.
  const directChildren = (profiles ?? []).filter(
    (p) => p.parent_berater_id === me.id,
  );
  const meStufe = Number(me.vertriebler_stufe ?? 0);
  const meImmo =
    me.immo_anteil_default == null ? null : Number(me.immo_anteil_default);
  let overheadGesamt = 0;
  const bester = directChildren
    .map((child) => {
      let oh = 0;
      for (const d of deals) {
        if (d.berater_id !== child.id || !won(d)) continue;
        oh += dealOverheadFuerUpline(
          d as unknown as DealFinanz,
          meStufe,
          meImmo,
          Number(child.vertriebler_stufe ?? 0),
          immoModus,
        );
      }
      overheadGesamt += oh;
      return { name: `${child.vorname} ${child.nachname}`, oh };
    })
    .sort((a, b) => b.oh - a.oh)[0];

  const stats: PartnerStats = {
    partnerCount: team.length,
    tippgeberCount: (tippgeber ?? []).length,
    overhead: overheadGesamt,
    bester: bester && bester.oh > 0 ? bester.name : "",
  };

  return (
    <>
      <Topbar
        title="Partner"
        subtitle="Deine Struktur — Berater, Tippgeber & Overhead"
      />
      <div className="space-y-6 px-6 py-6">
        <PartnerView stats={stats} team={team} />

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-base font-semibold">Mein Organigramm</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Deine Struktur als Baum. Fahre über einen Knoten — der Pfad leuchtet
            auf, der Rest tritt zurück. Knoten mit Downline lassen sich
            auf-/zuklappen.
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
