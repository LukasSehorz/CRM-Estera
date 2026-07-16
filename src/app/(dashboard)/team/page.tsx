import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { NeuerBeraterForm, type BeraterRow } from "./stufe-table";
import { NeuerSubBeraterForm } from "./neuer-sub-berater-form";
import { type TippgeberRow } from "./tippgeber-section";
import { TeamDirectory } from "./team-directory";
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
    .select("rolle, bereich")
    .eq("id", user.id)
    .single();
  // Backoffice hat kein Team; Berater sehen ihre EIGENE Struktur (3.9),
  // die GF alles. RLS liefert ohnehin nur die sichtbaren Profile.
  if (!me || me.rolle === "backoffice") redirect("/dashboard");
  const isGf = me.rolle === "geschaeftsfuehrung";
  const meineBereiche = (
    me.bereich?.length ? me.bereich : ["immobilien", "vv"]
  ) as ("immobilien" | "vv")[];

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
        "berater_id, bereich, kaufpreis, bws, tippgeber_id, pipeline_stages!inner(is_won, is_lost)",
      ),
  ]);

  const zielMap = new Map(
    (ziele ?? []).map((z) => [z.berater_id, z]),
  );

  // Mögliche Upline-Partner: ALLE aktiven Profile — mehrstufig erlaubt (3.7),
  // auch die GF als Wurzel. Zyklen verhindert set_berater_anbindung
  // serverseitig (is_ancestor); der Berater selbst wird pro Zeile ausgenommen.
  const partnerKandidaten = (profiles ?? [])
    .filter((p) => p.aktiv && p.rolle !== "backoffice")
    .map((p) => ({
      id: p.id,
      name: `${p.vorname} ${p.nachname}${p.rolle === "geschaeftsfuehrung" ? " (GF)" : ""}`,
    }));

  const profNameMap = new Map(
    (profiles ?? []).map((p) => [p.id, `${p.vorname} ${p.nachname}`]),
  );
  // Besitzer-Optionen für Tippgeber: die GF darf jeden zuordnen, ein Berater
  // nur sich selbst (RLS erzwingt das zusätzlich serverseitig).
  const ownerOptions = (profiles ?? [])
    .filter((p) => p.aktiv && (isGf || p.id === user.id))
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

  // Eingebrachter Umsatz je verwaltetem Tippgeber (3.3).
  const tippgeberPerf = new Map<string, { umsatz: number; vermittelt: number }>();
  for (const d of deals ?? []) {
    const st = (
      Array.isArray(d.pipeline_stages) ? d.pipeline_stages[0] : d.pipeline_stages
    ) as { is_won: boolean; is_lost: boolean } | null;
    if (!d.tippgeber_id || !st?.is_won) continue;
    const vol =
      d.bereich === "immobilien" ? Number(d.kaufpreis ?? 0) : Number(d.bws ?? 0);
    const cur = tippgeberPerf.get(d.tippgeber_id) ?? { umsatz: 0, vermittelt: 0 };
    cur.umsatz += vol;
    cur.vermittelt += 1;
    tippgeberPerf.set(d.tippgeber_id, cur);
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
      // Drilldown-Route ist GF-only — Berater bekommen keinen Link
      // (sonst tote Links mit Redirect, Feedback SJ).
      href:
        isGf && p.rolle !== "geschaeftsfuehrung"
          ? `/dashboard/berater/${p.id}`
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
    if (owner) {
      const tp = tippgeberPerf.get(t.id);
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
        perf: tp
          ? { abschluesse: tp.vermittelt, umsatz: tp.umsatz, pipeline: 0 }
          : undefined,
        children: [],
      });
    }
  }
  // Wurzel: GF sieht die Gesamtstruktur (alle elternlosen Berater hängen als
  // Zweige unter ihr), ein Berater sieht sich selbst als Wurzel seiner
  // eigenen Downline (3.9).
  const gfProfile = (profiles ?? []).find(
    (p) => p.rolle === "geschaeftsfuehrung",
  );
  const structureRoot = isGf
    ? gfProfile
      ? nodeMap.get(gfProfile.id)
      : undefined
    : nodeMap.get(user.id);
  if (isGf && structureRoot) {
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
        subtitle={
          isGf
            ? "Berater, Provisionsstufen & sichtbare Sparten — Geschäftsführung"
            : "Dein Team — eigene Berater & Tippgeber anlegen und verwalten"
        }
      />
      <div className="space-y-6 px-6 py-6">
        {/* Anlegen: die GF legt frei an, ein Berater legt seine eigene
            Downline an (3.8) — die Action hängt sie automatisch unter ihn. */}
        {isGf ? (
          <NeuerBeraterForm />
        ) : (
          <NeuerSubBeraterForm meineBereiche={meineBereiche} />
        )}
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-base font-semibold">
            {isGf ? "Struktur / Organigramm" : "Meine Struktur"}
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            Mehrstufige Partnerstruktur (Berater &amp; Tippgeber). Fahre über
            einen Knoten für dessen Performance, klicke zum Zoomen auf den Ast
            {isGf ? " — ein Klick auf den Berater-Namen öffnet dessen Details." : "."}
          </p>
          {structureRoot && <DecisionTree root={structureRoot} />}
        </div>
        <TeamDirectory
          beraterRows={rows}
          partnerKandidaten={partnerKandidaten}
          tippgeberRows={tippgeberRows}
          ownerOptions={ownerOptions}
          isGf={isGf}
        />
      </div>
    </>
  );
}
