import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { NeuerBeraterForm, StufeTable, type BeraterRow } from "./stufe-table";
import { TippgeberSection, type TippgeberRow } from "./tippgeber-section";
import {
  DecisionTree,
  type TreeNode,
} from "@/components/structure/decision-tree";

/**
 * Team-Verwaltung: nur Geschäftsführung. Berater anlegen, Vertriebler-Stufe
 * und sichtbare Sparten (Immobilien / VV / beide) je Berater setzen.
 */
export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("rolle")
    .eq("id", user.id)
    .single();
  if (me?.rolle !== "geschaeftsfuehrung") redirect("/dashboard");

  const [
    { data: profiles },
    { data: ziele },
    { data: tippgeber },
    { data: deals },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, vorname, nachname, rolle, aktiv, vertriebler_stufe, bereich, immo_anteil_default, parent_berater_id",
      )
      .order("rolle")
      .order("vorname"),
    supabase
      .from("berater_monatsziele")
      .select("berater_id, monatsziel_immobilien, monatsziel_vv"),
    supabase
      .from("tippgeber")
      .select("id, name, owner_id, provision_satz, bereiche")
      .order("created_at", { ascending: false }),
    supabase
      .from("deals")
      .select(
        "berater_id, bereich, kaufpreis, bws, pipeline_stages!inner(is_won, is_lost)",
      ),
  ]);

  const zielMap = new Map(
    (ziele ?? []).map((z) => [z.berater_id, z]),
  );

  // Mögliche Upline-Partner: alle Berater, die selbst keinen übergeordneten
  // Partner haben (eine Ebene, 8.2). Der Berater selbst wird pro Zeile
  // zusätzlich ausgenommen.
  const partnerKandidaten = (profiles ?? [])
    .filter((p) => p.rolle !== "geschaeftsfuehrung" && p.parent_berater_id == null)
    .map((p) => ({ id: p.id, name: `${p.vorname} ${p.nachname}` }));

  const profNameMap = new Map(
    (profiles ?? []).map((p) => [p.id, `${p.vorname} ${p.nachname}`]),
  );
  // Besitzer-Optionen für Tippgeber: alle aktiven Profile (Berater + GF).
  const ownerOptions = (profiles ?? [])
    .filter((p) => p.aktiv)
    .map((p) => ({ id: p.id, name: `${p.vorname} ${p.nachname}` }));
  const tippgeberRows: TippgeberRow[] = (tippgeber ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    ownerId: t.owner_id,
    ownerName: profNameMap.get(t.owner_id) ?? "—",
    provisionSatz:
      t.provision_satz == null ? "" : String(Number(t.provision_satz)),
    bereiche: (t.bereiche?.length ? t.bereiche : ["immobilien"]) as (
      | "immobilien"
      | "vv"
    )[],
  }));

  const rows: BeraterRow[] = (profiles ?? []).map((p) => {
    const z = zielMap.get(p.id);
    return {
      id: p.id,
      name: `${p.vorname} ${p.nachname}`,
      rolle: p.rolle,
      aktiv: p.aktiv,
      stufe: p.vertriebler_stufe == null ? "" : String(p.vertriebler_stufe),
      bereiche: (p.bereich?.length ? p.bereich : ["immobilien", "vv"]) as (
        | "immobilien"
        | "vv"
      )[],
      immoDefault:
        p.immo_anteil_default == null ? "" : String(Number(p.immo_anteil_default)),
      parentId: p.parent_berater_id ?? "",
      zielImmo:
        z?.monatsziel_immobilien == null ? "" : String(Number(z.monatsziel_immobilien)),
      zielVv: z?.monatsziel_vv == null ? "" : String(Number(z.monatsziel_vv)),
    };
  });

  // Performance je Berater (Hover-Anzeige im Organigramm): Volumen = Kaufpreis
  // (Immo) bzw. BWS (VV); gewonnen vs. offen.
  const perfMap = new Map<
    string,
    { abschluesse: number; umsatz: number; pipeline: number }
  >();
  for (const d of deals ?? []) {
    const st = (
      Array.isArray(d.pipeline_stages) ? d.pipeline_stages[0] : d.pipeline_stages
    ) as { is_won: boolean; is_lost: boolean } | null;
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

  // Organigramm: Profile mehrstufig (parent_berater_id) + Tippgeber als Blätter.
  const nodeMap = new Map<string, TreeNode>();
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
        bereiche: (t.bereiche?.length ? t.bereiche : ["immobilien"]) as (
          | "immobilien"
          | "vv"
        )[],
        children: [],
      });
  }
  // Wurzel = Geschäftsführung; alle Berater ohne eigenen Partner hängen als
  // deren direkte Zweige darunter (Anzeige-Struktur, Entscheidungsbaum).
  const gfProfile = (profiles ?? []).find(
    (p) => p.rolle === "geschaeftsfuehrung",
  );
  const structureRoot = gfProfile ? nodeMap.get(gfProfile.id) : undefined;
  if (structureRoot) {
    for (const p of profiles ?? []) {
      if (!p.parent_berater_id && p.rolle !== "geschaeftsfuehrung") {
        structureRoot.children.push(nodeMap.get(p.id)!);
      }
    }
  }

  return (
    <>
      <Topbar
        title="Team-Verwaltung"
        subtitle="Berater, Provisionsstufen & sichtbare Sparten — nur Geschäftsführung"
      />
      <div className="space-y-6 px-6 py-6">
        <NeuerBeraterForm />
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-base font-semibold">Struktur / Organigramm</h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Mehrstufige Partnerstruktur (Berater &amp; Tippgeber). Fahre über
            einen Knoten für dessen Performance.
          </p>
          {structureRoot && <DecisionTree root={structureRoot} />}
        </div>
        <div className="space-y-2">
          <p className="max-w-2xl text-sm text-muted-foreground">
            Die Stufe bestimmt den persönlichen Provisionsanteil (Netto-Provision
            × Stufe). Die Sparten steuern, welche Bereiche der Berater sieht —
            durchgesetzt in der Datenbank, nicht nur in der Oberfläche. Die
            Monatsziele (eigene Provision, gemeinsam mit dem Berater vereinbart)
            treiben die Ziel-Box im Berater-Dashboard.
          </p>
          <StufeTable rows={rows} partnerKandidaten={partnerKandidaten} />
        </div>
        <TippgeberSection rows={tippgeberRows} ownerOptions={ownerOptions} />
      </div>
    </>
  );
}
