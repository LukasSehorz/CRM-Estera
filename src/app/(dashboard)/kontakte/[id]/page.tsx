import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { Pill } from "@/components/ui/pill";
import { bereichLabel, finanzierungsstatusLabel } from "@/config/enums";
import { formatEUR } from "@/lib/format";
import { dealVolumen } from "@/lib/provision";
import { ContactForm, type FormState } from "../contact-form";
import { DocumentChecklist, type DocType } from "../document-checklist";
import { groupDocsByType } from "@/lib/dokumente";
import { ContactTimeline, type ActivityRow } from "../contact-timeline";
import { ContactTasks, type TaskRow } from "../contact-tasks";
import { QuickActions } from "../quick-actions";

export default async function KontaktDetailPage({
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

  const { data: me } = await supabase
    .from("profiles")
    .select("rolle")
    .eq("id", user.id)
    .single();
  const isGf = me?.rolle === "geschaeftsfuehrung";

  // RLS sorgt dafür, dass ein Berater fremde Kontakte gar nicht erhält -> 404.
  const { data: c } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();

  const istImmoKontakt = (c.interesse ?? []).includes("immobilien");

  const [
    { data: docs },
    { data: docTypes },
    { data: docStatus },
    { data: activities },
    { data: contactTasks },
    { data: contactDeals },
    { data: stages },
    { data: profiles },
  ] = await Promise.all([
    supabase
      .from("contact_documents")
      .select(
        "id, dateiname, storage_path, kategorie, document_type_id, groesse, created_at",
      )
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("document_types")
      .select("id, gruppe, name, position")
      .eq("aktiv", true)
      .order("position"),
    supabase
      .from("contact_document_status")
      .select("document_type_id, vorhanden, document_id")
      .eq("contact_id", id),
    supabase
      .from("contact_activities")
      .select("id, typ, text, created_by, created_at")
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("tasks")
      .select("id, titel, faellig_am, erledigt")
      .eq("contact_id", id),
    supabase
      .from("deals")
      .select("id, dealname, bereich, stage_id, kaufpreis, bws, factoring, provisionssatz, berater_anteil")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("pipeline_stages").select("id, name, is_won, is_lost"),
    supabase.from("profiles").select("id, vorname, nachname"),
  ]);

  let beraterOptions: { id: string; name: string }[] = [];
  if (isGf) {
    beraterOptions = (profiles ?? []).map((p) => ({
      id: p.id,
      name: `${p.vorname} ${p.nachname}`,
    }));
  }

  // „Auf Objekt belegt" (15.2): nur Immobilien-Deals dieses Kontakts.
  const dealOptions = (contactDeals ?? [])
    .filter((d) => d.bereich === "immobilien")
    .map((d) => ({ id: d.id, name: d.dealname }));

  const initial: FormState = {
    vorname: c.vorname,
    nachname: c.nachname,
    email: c.email ?? "",
    telefon: c.telefon ?? "",
    berater_id: c.berater_id,
    status: c.status,
    termin_status: c.termin_status,
    leadquelle: c.leadquelle ?? "",
    interesse: c.interesse ?? [],
    nettoverdienst_monatlich: c.nettoverdienst_monatlich?.toString() ?? "",
    eigenkapital: c.eigenkapital?.toString() ?? "",
    einschaetzung: c.einschaetzung ?? "ausstehend",
    eingeschaetzter_betrag: c.eingeschaetzter_betrag?.toString() ?? "",
    belegt_deal_id: c.belegt_deal_id ?? "",
    unterlagen_vollstaendig: c.unterlagen_vollstaendig,
    fehlende_unterlagen: c.fehlende_unterlagen ?? "",
    finanzierungsstatus: c.finanzierungsstatus ?? "offen",
    ist_selbststaendig: c.ist_selbststaendig ?? false,
    ist_immobilienbesitzer: c.ist_immobilienbesitzer ?? false,
    ist_bestandskunde: c.ist_bestandskunde ?? false,
  };

  // Manueller „vorhanden"-Haken je Typ (auch ohne Datei setzbar).
  const vorhandenMap: Record<string, boolean> = {};
  for (const s of docStatus ?? []) vorhandenMap[s.document_type_id] = s.vorhanden;

  const sichtbareTypes = (docTypes ?? []) as DocType[];
  // Alle Dokumente (auch Altbestand aus freiem Upload) den Checklisten-Punkten
  // zuordnen (Call SJ: eine universelle Checkliste, keine getrennte Sektion).
  const filesByType = groupDocsByType(
    (docs ?? []).map((d) => ({
      id: d.id,
      dateiname: d.dateiname,
      storage_path: d.storage_path,
      groesse: d.groesse,
      created_at: d.created_at,
      document_type_id: d.document_type_id,
      kategorie: d.kategorie,
    })),
    sichtbareTypes,
  );
  const anwendbar = sichtbareTypes.filter(
    (t) =>
      t.gruppe === "allgemein" ||
      (t.gruppe === "selbststaendig" && c.ist_selbststaendig) ||
      (t.gruppe === "immobilienbesitzer" && c.ist_immobilienbesitzer),
  );
  const vorhandenCount = anwendbar.filter(
    (t) => vorhandenMap[t.id] || (filesByType[t.id]?.length ?? 0) > 0,
  ).length;

  const profMap = new Map(
    (profiles ?? []).map((p) => [p.id, `${p.vorname} ${p.nachname}`]),
  );
  const activityRows: ActivityRow[] = (activities ?? []).map((a) => ({
    id: a.id,
    typ: a.typ,
    text: a.text,
    created_at: a.created_at,
    created_by_name: a.created_by ? (profMap.get(a.created_by) ?? null) : null,
  }));

  const sMap = new Map((stages ?? []).map((s) => [s.id, s]));
  const finStatusTone =
    c.finanzierungsstatus === "zugesagt"
      ? "success"
      : c.finanzierungsstatus === "in_pruefung"
        ? "warning"
        : "muted";

  return (
    <>
      <Topbar
        title={`${c.vorname} ${c.nachname}`}
        subtitle="Kundenakte — alles zu diesem Kunden an einem Ort"
        backHref="/kontakte"
      >
        <Pill tone={finStatusTone}>
          Finanzierung: {finanzierungsstatusLabel(c.finanzierungsstatus)}
        </Pill>
        {istImmoKontakt && (
          <Pill tone={vorhandenCount === anwendbar.length ? "success" : "accent"}>
            Dokumente {vorhandenCount}/{anwendbar.length}
          </Pill>
        )}
      </Topbar>
      <div className="px-6 py-6 pb-28">
        <div className="grid items-start gap-6 xl:grid-cols-3">
          {/* Linke Spalte: Stammdaten + Dokumente */}
          <div className="space-y-6 xl:col-span-2">
            <ContactForm
              mode="edit"
              contactId={c.id}
              initial={initial}
              canAssignBerater={isGf}
              beraterOptions={beraterOptions}
              dealOptions={dealOptions}
            />
            {/* EINE universelle Dokumenten-Checkliste je Kunde — enthält alle
                Kategorien (inkl. „Sonstige"), Dateien je Punkt aufklappbar.
                Die frühere freie „Dokumente"-Sektion entfällt (Call SJ). */}
            <DocumentChecklist
              contactId={c.id}
              istSelbststaendig={c.ist_selbststaendig}
              istImmobilienbesitzer={c.ist_immobilienbesitzer}
              types={sichtbareTypes}
              vorhanden={vorhandenMap}
              filesByType={filesByType}
            />
          </div>

          {/* Rechte Spalte: Schnellaktionen, Deals, Aufgaben, Timeline */}
          <div className="space-y-6">
            <QuickActions
              telefon={c.telefon}
              email={c.email}
              name={`${c.vorname} ${c.nachname}`}
            />
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="text-base font-semibold">Deals des Kunden</h2>
              {(contactDeals ?? []).length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Noch kein Deal verknüpft.
                </p>
              ) : (
                <ul className="mt-2 divide-y divide-border">
                  {(contactDeals ?? []).map((d) => {
                    const st = sMap.get(d.stage_id);
                    return (
                      <li key={d.id}>
                        <Link
                          href={`/deals/${d.id}`}
                          className="-mx-2 flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-2"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {d.dealname}
                            </div>
                            <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Pill
                                tone={
                                  st?.is_won
                                    ? "success"
                                    : st?.is_lost
                                      ? "danger"
                                      : "accent"
                                }
                              >
                                {st?.name ?? "—"}
                              </Pill>
                              <span>{bereichLabel(d.bereich)}</span>
                            </div>
                          </div>
                          <span className="shrink-0 text-sm font-semibold tabular-nums">
                            {formatEUR(dealVolumen(d))}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <ContactTasks
              contactId={c.id}
              tasks={(contactTasks ?? []) as TaskRow[]}
            />
            <ContactTimeline contactId={c.id} activities={activityRows} />
          </div>
        </div>
      </div>
    </>
  );
}
