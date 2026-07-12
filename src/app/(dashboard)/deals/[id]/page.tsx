import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { bereichLabel } from "@/config/enums";
import { DealForm, type DealFormState } from "../deal-form";
import { DealSidebar, type HistoryItem } from "./deal-sidebar";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // RLS sorgt dafür, dass ein Berater fremde Deals gar nicht erhält -> 404.
  const { data: d } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!d) notFound();

  const bereich = d.bereich as "immobilien" | "vv";

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name, position, wahrscheinlichkeit, is_won, is_lost")
    .eq("bereich", bereich)
    .order("position");
  const stageList = stages ?? [];
  const stageOpts = stageList.map((s) => ({ id: s.id, name: s.name }));
  const stageMap = Object.fromEntries(stageList.map((s) => [s.id, s]));

  const { data: contact } = await supabase
    .from("contacts")
    .select("vorname, nachname")
    .eq("id", d.contact_id)
    .maybeSingle();
  const contactName = contact
    ? `${contact.vorname} ${contact.nachname}`
    : "—";

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, vorname, nachname, rolle, vertriebler_stufe");
  const profMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, `${p.vorname} ${p.nachname}`]),
  );
  const vertrieblerStufe = Number(
    (profiles ?? []).find((p) => p.id === d.berater_id)?.vertriebler_stufe ?? 0,
  );
  const isGf =
    (profiles ?? []).find((p) => p.id === user.id)?.rolle ===
    "geschaeftsfuehrung";

  const { data: history } = await supabase
    .from("deal_stage_history")
    .select("id, stage_id, entered_at, left_at, changed_by")
    .eq("deal_id", id)
    .order("entered_at", { ascending: false });

  const historyVM: HistoryItem[] = (history ?? []).map((h) => ({
    id: h.id,
    stageName: stageMap[h.stage_id]?.name ?? "—",
    enteredAt: h.entered_at,
    leftAt: h.left_at,
    changedByName: h.changed_by ? (profMap[h.changed_by] ?? null) : null,
  }));

  const current = stageMap[d.stage_id];

  const initial: DealFormState = {
    contact_id: d.contact_id,
    dealname: d.dealname,
    stage_id: d.stage_id,
    naechster_termin: d.naechster_termin ?? "",
    bemerkungen: d.bemerkungen ?? "",
    next_step: d.next_step ?? "",
    next_step_faellig: d.next_step_faellig ?? "",
    kaufpreis: d.kaufpreis?.toString() ?? "",
    objekt_adresse: d.objekt_adresse ?? "",
    objekt_status: d.objekt_status ?? "",
    notartermin: d.notartermin ?? "",
    provisionssatz: d.provisionssatz?.toString() ?? "",
    berater_anteil: d.berater_anteil?.toString() ?? "",
    bws: d.bws?.toString() ?? "",
    sparbeitrag: d.sparbeitrag?.toString() ?? "",
    anzahl_jahre: d.anzahl_jahre?.toString() ?? "",
    vv_zahlart:
      d.vv_zahlart ?? (d.ratierlich ? "ratierlich" : d.factoring ? "factoring" : "ohne_factoring"),
    tippgeber: d.tippgeber ?? "",
    tippgeber_satz: d.tippgeber_satz?.toString() ?? "",
  };

  return (
    <>
      <Topbar
        title={d.dealname}
        subtitle={`${bereichLabel(bereich)} · ${contactName}`}
        backHref={bereich === "vv" ? "/vermoegensverwaltung" : "/immobilien"}
      />
      <div className="px-6 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DealForm
              mode="edit"
              dealId={d.id}
              bereich={bereich}
              initial={initial}
              stages={stageOpts}
              contactOptions={[]}
              contactName={contactName}
              vertrieblerStufe={vertrieblerStufe}
              isGf={isGf}
            />
          </div>
          <DealSidebar
            bereich={bereich}
            contactId={d.contact_id}
            contactName={contactName}
            beraterName={profMap[d.berater_id] ?? "—"}
            currentStageName={current?.name ?? "—"}
            wahrscheinlichkeit={current?.wahrscheinlichkeit ?? 0}
            isWon={current?.is_won ?? false}
            isLost={current?.is_lost ?? false}
            createdAt={d.created_at}
            closedAt={d.closed_at}
            history={historyVM}
          />
        </div>
      </div>
    </>
  );
}
