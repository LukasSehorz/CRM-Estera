import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { AufgabenView, type AufgabeRow } from "./aufgaben-view";

/**
 * Zentraler To-Do-Ort über alle Deals hinweg (Schleife 2, 4.3) —
 * „wie eine To-Do-App", sortiert nach Fälligkeit. RLS: jeder sieht nur
 * die eigenen Aufgaben (GF alle).
 */
export default async function AufgabenPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  // Zurück zur Herkunft (Feedback SJ): kommt man z. B. vom Dashboard, führt
  // „Zurück" auch dorthin — sonst aufs Dashboard als sinnvolle Startseite.
  const { from } = await searchParams;
  const backHref = from && from.startsWith("/") ? from : "/dashboard";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: tasks },
    { data: contacts },
    { data: deals },
    { data: profiles },
    { data: personen },
  ] = await Promise.all([
      supabase
        .from("tasks")
        .select(
          "id, titel, beschreibung, faellig_am, erledigt, contact_id, deal_id, owner_id, assigned_to",
        )
        .order("faellig_am", { ascending: true, nullsFirst: false }),
      supabase
        .from("contacts")
        .select("id, vorname, nachname")
        .order("nachname"),
      supabase
        .from("deals")
        .select("id, dealname, contact_id")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, vorname, nachname, rolle, aktiv")
        .order("vorname"),
      // Zuweisbare Personen kommen NICHT aus profiles: deren RLS zeigt einem
      // Berater nur sich und seine Downline. Die Funktion gibt alle aktiven
      // Personen heraus — aber nur Id/Name/Rolle, nie Stufe oder Anteil
      // (Mandant 06.08.: jeder darf jedem zuweisen).
      supabase.rpc("zuweisbare_personen"),
    ]);

  const contactMap = new Map(
    (contacts ?? []).map((c) => [c.id, `${c.vorname} ${c.nachname}`]),
  );
  const dealMap = new Map((deals ?? []).map((d) => [d.id, d.dealname]));
  type Person = { id: string; name: string; rolle: string };
  const personenListe = (personen ?? []) as Person[];
  // Namen aus beiden Quellen: profiles (eigene Downline) + die zuweisbaren
  // Personen, damit auch „an die Geschäftsführung" einen Namen bekommt.
  const nameMap = new Map<string, string>([
    ...(profiles ?? []).map(
      (p) => [p.id, `${p.vorname} ${p.nachname}`] as [string, string],
    ),
    ...personenListe.map((p) => [p.id, p.name] as [string, string]),
  ]);

  const rows: AufgabeRow[] = (tasks ?? []).map((t) => ({
    id: t.id,
    titel: t.titel,
    beschreibung: t.beschreibung,
    faellig_am: t.faellig_am,
    erledigt: t.erledigt,
    contact_id: t.contact_id,
    deal_id: t.deal_id,
    kontaktName: t.contact_id ? (contactMap.get(t.contact_id) ?? null) : null,
    dealName: t.deal_id ? (dealMap.get(t.deal_id) ?? null) : null,
    ownerId: t.owner_id,
    assignedTo: t.assigned_to,
    assignedName: t.assigned_to ? (nameMap.get(t.assigned_to) ?? null) : null,
    ownerName: nameMap.get(t.owner_id) ?? null,
  }));

  // Zuweisbare Personen: sichtbare aktive Profile außer man selbst. Für einen
  // Berater sind das (per RLS) genau seine Downline, für die GF alle.
  const beraterOptionen = personenListe.map((p) => ({
    id: p.id,
    name:
      p.rolle === "geschaeftsfuehrung"
        ? `${p.name} (Geschäftsführung)`
        : p.rolle === "finanzierer"
          ? `${p.name} (Finanzierer)`
          : p.name,
  }));

  return (
    <>
      <Topbar
        title="Aufgaben"
        subtitle="Dein zentraler To-Do-Ort — überfällig zuerst"
        backHref={backHref}
      />
      <div className="px-6 py-6">
        <AufgabenView
          rows={rows}
          currentUserId={user.id}
          kontaktOptionen={(contacts ?? []).map((c) => ({
            id: c.id,
            name: `${c.vorname} ${c.nachname}`,
          }))}
          dealOptionen={(deals ?? []).map((d) => ({
            id: d.id,
            name: d.dealname,
            contactId: d.contact_id,
          }))}
          beraterOptionen={beraterOptionen}
        />
      </div>
    </>
  );
}
