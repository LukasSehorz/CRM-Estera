import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { getImmoModus } from "@/lib/einstellungen";
import { NeuerBeraterForm, StufeTable, type BeraterRow } from "./stufe-table";
import { ImmoProvisionCard } from "./einstellungen-card";

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

  const immoModus = await getImmoModus();
  const [{ data: profiles }, { data: ziele }] = await Promise.all([
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

  return (
    <>
      <Topbar
        title="Team-Verwaltung"
        subtitle="Berater, Provisionsstufen & sichtbare Sparten — nur Geschäftsführung"
      />
      <div className="space-y-6 px-6 py-6">
        <NeuerBeraterForm />
        <ImmoProvisionCard aktuell={immoModus} />
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
      </div>
    </>
  );
}
