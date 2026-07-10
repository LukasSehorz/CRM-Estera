import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { ContactsTable, type ContactRow } from "../../kontakte/contacts-table";

const META: Record<string, { title: string; subtitle: string }> = {
  alle: { title: "Alle Kontakte", subtitle: "Immobilien + Vermögensverwaltung" },
  immobilien: { title: "Immobilien-Kontakte", subtitle: "Interesse = Immobilien" },
  vv: { title: "Vermögensverwaltung-Kontakte", subtitle: "Interesse = Vermögensverwaltung" },
  eingeschaetzt: { title: "Eingeschätzte Kunden", subtitle: "Mit Finanzierungseinschätzung, nach Volumen sortiert" },
  heiss: { title: "Heiße Leads", subtitle: "Termin durchgeführt, aber noch kein Deal in fortgeschrittener Phase" },
  offen: { title: "Offene Leads", subtitle: "Noch kein Termin vereinbart" },
};

// Ab welcher Phase gilt ein Deal als „fortgeschritten" (Annahme lt. Datenmodell,
// mit Kunde zu bestätigen): Immobilien ab „Objekt reserviert", VV ab „Strategie
// erstellt" — Position >= 4 im jeweiligen Bereich, oder bereits gewonnen.
function istFortgeschritten(bereich: string, pos: number, isWon: boolean) {
  if (isWon) return true;
  return pos >= 4;
}

export default async function KontaktListenPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string }>;
}) {
  const { preset = "alle" } = await searchParams;
  const meta = META[preset] ?? META.alle;

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

  const { data: contacts } = await supabase
    .from("contacts")
    .select(
      "id, vorname, nachname, email, telefon, status, termin_status, leadquelle, interesse, finanzierungsrahmen_betrag, eingeschaetzter_betrag, einschaetzung_erhalten, berater_id, created_at",
    )
    .order("created_at", { ascending: false });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, vorname, nachname");
  const beraterMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, `${p.vorname} ${p.nachname}`]),
  );

  let list = contacts ?? [];

  if (preset === "immobilien") {
    list = list.filter((c) => c.interesse?.includes("immobilien"));
  } else if (preset === "vv") {
    list = list.filter((c) => c.interesse?.includes("vv"));
  } else if (preset === "eingeschaetzt") {
    list = list
      .filter((c) => c.einschaetzung_erhalten)
      .sort(
        (a, b) => (b.eingeschaetzter_betrag ?? 0) - (a.eingeschaetzter_betrag ?? 0),
      );
  } else if (preset === "offen") {
    list = list.filter((c) => c.termin_status === "Nicht vereinbart");
  } else if (preset === "heiss") {
    // Kontakte mit fortgeschrittenem Deal ermitteln.
    const [{ data: deals }, { data: stages }] = await Promise.all([
      supabase.from("deals").select("contact_id, bereich, stage_id"),
      supabase
        .from("pipeline_stages")
        .select("id, position, is_won"),
    ]);
    const sMap = new Map((stages ?? []).map((s) => [s.id, s]));
    const fortgeschritten = new Set<string>();
    for (const d of deals ?? []) {
      const s = sMap.get(d.stage_id);
      if (s && istFortgeschritten(d.bereich, s.position, s.is_won))
        fortgeschritten.add(d.contact_id);
    }
    list = list.filter(
      (c) => c.termin_status === "Durchgeführt" && !fortgeschritten.has(c.id),
    );
  }

  const rows = list as unknown as ContactRow[];

  return (
    <>
      <Topbar title={meta.title} subtitle={meta.subtitle} backHref="/listen" />
      <div className="px-6 py-6">
        <ContactsTable
          contacts={rows}
          beraterMap={beraterMap}
          isGf={isGf}
          showVolumen={preset === "eingeschaetzt"}
        />
      </div>
    </>
  );
}
