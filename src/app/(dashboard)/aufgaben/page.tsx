import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { AufgabenView, type AufgabeRow } from "./aufgaben-view";

/**
 * Zentraler To-Do-Ort über alle Deals hinweg (Schleife 2, 4.3) —
 * „wie eine To-Do-App", sortiert nach Fälligkeit. RLS: jeder sieht nur
 * die eigenen Aufgaben (GF alle).
 */
export default async function AufgabenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: tasks }, { data: contacts }, { data: deals }] =
    await Promise.all([
      supabase
        .from("tasks")
        .select("id, titel, faellig_am, erledigt, contact_id, deal_id")
        .order("faellig_am", { ascending: true, nullsFirst: false }),
      supabase
        .from("contacts")
        .select("id, vorname, nachname")
        .order("nachname"),
      supabase
        .from("deals")
        .select("id, dealname")
        .order("created_at", { ascending: false }),
    ]);

  const contactMap = new Map(
    (contacts ?? []).map((c) => [c.id, `${c.vorname} ${c.nachname}`]),
  );
  const dealMap = new Map((deals ?? []).map((d) => [d.id, d.dealname]));

  const rows: AufgabeRow[] = (tasks ?? []).map((t) => ({
    id: t.id,
    titel: t.titel,
    faellig_am: t.faellig_am,
    erledigt: t.erledigt,
    contact_id: t.contact_id,
    deal_id: t.deal_id,
    kontaktName: t.contact_id ? (contactMap.get(t.contact_id) ?? null) : null,
    dealName: t.deal_id ? (dealMap.get(t.deal_id) ?? null) : null,
  }));

  return (
    <>
      <Topbar
        title="Aufgaben"
        subtitle="Dein zentraler To-Do-Ort — überfällig zuerst"
      />
      <div className="px-6 py-6">
        <AufgabenView
          rows={rows}
          kontaktOptionen={(contacts ?? []).map((c) => ({
            id: c.id,
            name: `${c.vorname} ${c.nachname}`,
          }))}
          dealOptionen={(deals ?? []).map((d) => ({
            id: d.id,
            name: d.dealname,
          }))}
        />
      </div>
    </>
  );
}
