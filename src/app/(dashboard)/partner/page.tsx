import { redirect } from "next/navigation";
import { Handshake, TrendingUp, Trophy, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { getImmoModus } from "@/lib/einstellungen";
import { dealOverheadFuerUpline, type DealFinanz } from "@/lib/provision";
import { formatEUR } from "@/lib/format";
import { StructureTree, type StructureNode } from "../team/structure-tree";
import { TeamBuilder } from "./team-builder";

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

function stageOf(d: DealRow): StageJoin | null {
  return Array.isArray(d.pipeline_stages)
    ? (d.pipeline_stages[0] ?? null)
    : d.pipeline_stages;
}

/**
 * „Partner"-Bereich (Call SJ F5, Schritt D+E): eigenes Organigramm der Downline
 * mit Hover-Performance, Team-Builder (Tippgeber + Unter-Berater) und
 * gamifizierten Kennzahlen inkl. verdientem Overhead (Differenz-Modell).
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

  // RLS liefert nur eigene + Downline (mehrstufig).
  const [{ data: profiles }, { data: tippgeber }, { data: dealsRaw }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, vorname, nachname, rolle, vertriebler_stufe, immo_anteil_default, parent_berater_id, aktiv",
        ),
      supabase
        .from("tippgeber")
        .select("id, name, owner_id, provision_satz, bereiche"),
      supabase
        .from("deals")
        .select(
          "berater_id, bereich, kaufpreis, bws, factoring, vv_zahlart, ratierlich, provisionssatz, berater_anteil, tippgeber_satz, pipeline_stages!inner(is_won, is_lost)",
        ),
    ]);

  const deals = (dealsRaw ?? []) as unknown as DealRow[];

  // Performance je Berater (Hover im Organigramm): Volumen gewonnen vs. offen.
  const perfMap = new Map<
    string,
    { abschluesse: number; umsatz: number; pipeline: number }
  >();
  for (const d of deals) {
    const st = stageOf(d);
    const vol =
      d.bereich === "immobilien" ? Number(d.kaufpreis ?? 0) : Number(d.bws ?? 0);
    const cur = perfMap.get(d.berater_id) ?? {
      abschluesse: 0,
      umsatz: 0,
      pipeline: 0,
    };
    if (st?.is_won) {
      cur.abschluesse += 1;
      cur.umsatz += vol;
    } else if (!st?.is_lost) {
      cur.pipeline += vol;
    }
    perfMap.set(d.berater_id, cur);
  }

  // Baum, gewurzelt beim angemeldeten Berater.
  const nodeMap = new Map<string, StructureNode>();
  for (const p of profiles ?? []) {
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
      perf: perfMap.get(p.id),
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
  const roots = meNode ? [meNode] : [];

  // Kennzahlen
  const partnerCount = (profiles ?? []).filter(
    (p) => p.id !== me.id && p.rolle !== "geschaeftsfuehrung",
  ).length;
  const tippgeberCount = (tippgeber ?? []).length;

  // Overhead aus DIREKTEN Partnern (Differenz-Modell; tiefere Ebenen verdient
  // der jeweils direkte Upline — mehrstufige Overhead-Kaskade ist Spec-Frage).
  const directChildren = (profiles ?? []).filter(
    (p) => p.parent_berater_id === me.id,
  );
  const meStufe = Number(me.vertriebler_stufe ?? 0);
  const meImmo = me.immo_anteil_default == null ? null : Number(me.immo_anteil_default);
  let overheadGesamt = 0;
  const bester = directChildren
    .map((child) => {
      let oh = 0;
      for (const d of deals) {
        if (d.berater_id !== child.id) continue;
        if (!stageOf(d)?.is_won) continue;
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

  return (
    <>
      <Topbar
        title="Partner"
        subtitle="Deine Struktur — Berater, Tippgeber & Overhead"
      />
      <div className="space-y-6 px-6 py-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={Users}
            label="Berater in deiner Struktur"
            value={String(partnerCount)}
          />
          <Stat icon={Handshake} label="Tippgeber" value={String(tippgeberCount)} />
          <Stat
            icon={TrendingUp}
            label="Overhead verdient"
            value={formatEUR(overheadGesamt)}
          />
          <Stat
            icon={Trophy}
            label="Bester Partner"
            value={bester && bester.oh > 0 ? bester.name : "—"}
          />
        </div>

        <TeamBuilder meId={me.id} />

        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-base font-semibold">Mein Organigramm</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Deine Downline (mehrstufig). Fahre über einen Knoten für dessen
            Performance.
          </p>
          <StructureTree
            roots={roots}
            leerText="Du hast noch keine Partner. Lege oben deinen ersten Tippgeber oder Berater an."
          />
        </div>
      </div>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 truncate text-2xl font-semibold tabular-nums">
        {value}
      </div>
    </div>
  );
}
