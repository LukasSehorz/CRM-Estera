import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { bereichLabel } from "@/config/enums";
import { getImmoModus } from "@/lib/einstellungen";
import { DealForm, type DealFormState } from "../deal-form";

export default async function NeuerDealPage({
  searchParams,
}: {
  searchParams: Promise<{ bereich?: string }>;
}) {
  const { bereich: bRaw } = await searchParams;
  const bereich = bRaw === "vv" ? "vv" : "immobilien";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("vertriebler_stufe, rolle, bereich")
    .eq("id", user.id)
    .single();
  const vertrieblerStufe = Number(me?.vertriebler_stufe ?? 0);
  const isGf = me?.rolle === "geschaeftsfuehrung";

  // Sparten-Guard: Deal-Anlage nur in freigeschalteten Bereichen (RLS
  // erzwingt es zusätzlich beim Insert).
  const meineBereiche =
    isGf || !me?.bereich?.length ? ["immobilien", "vv"] : me.bereich;
  if (!meineBereiche.includes(bereich)) {
    redirect(
      meineBereiche[0] === "vv" ? "/deals/neu?bereich=vv" : "/deals/neu",
    );
  }

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name, position")
    .eq("bereich", bereich)
    .order("position");
  const stageOpts = (stages ?? []).map((s) => ({ id: s.id, name: s.name }));

  // Kontakte mit Interesse am Bereich (RLS: Berater nur eigene, GF alle).
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, vorname, nachname")
    .contains("interesse", [bereich])
    .order("nachname");
  const contactOpts = (contacts ?? []).map((c) => ({
    id: c.id,
    name: `${c.vorname} ${c.nachname}`,
  }));

  // Verwaltete Tippgeber für die Deal-Auswahl (3.3) — RLS liefert eigene +
  // Downline (GF alle).
  const { data: tippgeber } = await supabase
    .from("tippgeber")
    .select("id, name, provision_satz, bereiche")
    .eq("aktiv", true)
    .order("name");
  const tippgeberOpts = (tippgeber ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    satz: t.provision_satz == null ? "" : String(Number(t.provision_satz)),
    bereiche: (t.bereiche?.length ? t.bereiche : ["immobilien"]) as (
      | "immobilien"
      | "vv"
    )[],
  }));

  const initial: DealFormState = {
    contact_id: "",
    dealname: "",
    stage_id: stageOpts[0]?.id ?? "",
    naechster_termin: "",
    bemerkungen: "",
    next_step: "",
    next_step_faellig: "",
    kaufpreis: "",
    objekt_adresse: "",
    objekt_status: "",
    notartermin: "",
    provisionssatz: "",
    berater_anteil: "",
    bws: "",
    sparbeitrag: "",
    anzahl_jahre: "",
    vv_zahlart: "factoring",
    tippgeber: "",
    tippgeber_satz: "",
    tippgeber_id: "",
  };

  return (
    <>
      <Topbar
        title="Neuer Deal"
        subtitle={`Bereich ${bereichLabel(bereich)}`}
        backHref={bereich === "vv" ? "/vermoegensverwaltung" : "/immobilien"}
      />
      <div className="px-6 py-6">
        <DealForm
          mode="create"
          bereich={bereich}
          initial={initial}
          stages={stageOpts}
          contactOptions={contactOpts}
          vertrieblerStufe={vertrieblerStufe}
          isGf={isGf}
          immoModus={await getImmoModus()}
          tippgeberOptions={tippgeberOpts}
        />
      </div>
    </>
  );
}
