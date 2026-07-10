import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { DashboardTabs } from "../dashboard-tabs";
import { BereichSwitcher } from "../bereich-switcher";
import { EingeschaetztView, type EingRow } from "./eingeschaetzt-view";
import { loadAnalytics, resolveScope, erlaubteScopes } from "@/lib/analytics";

export default async function EingeschaetztDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ bereich?: string }>;
}) {
  const { bereich: rawBereich } = await searchParams;
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

  const a = await loadAnalytics();
  const scope = resolveScope(a, rawBereich);
  // „Finanzierungs-OK": Einschätzung positiv oder bedingt positiv;
  // der Bereichs-Umschalter filtert zusätzlich nach Interesse des Kontakts.
  const eligible = a.contacts.filter(
    (c) =>
      (c.einschaetzung_status === "Positiv" ||
        c.einschaetzung_status === "Bedingt positiv") &&
      (scope === "gesamt" || c.interesse.includes(scope)),
  );

  const rows: EingRow[] = eligible.map((c) => ({
    id: c.id,
    name: `${c.vorname} ${c.nachname}`,
    beraterId: c.berater_id,
    berater: a.beraterMap.get(c.berater_id) ?? "—",
    status: c.einschaetzung_status,
    betrag: c.eingeschaetzter_betrag ?? 0,
    rahmen: c.finanzierungsrahmen_betrag ?? 0,
  }));

  const beraterOptions = isGf
    ? [...a.beraterMap.entries()].map(([id, name]) => ({ id, name }))
    : [];

  return (
    <>
      <Topbar
        title="Eingeschätzte Kunden"
        subtitle="Qualifizierte Leads mit Finanzierungs-OK · filterbar"
      />
      <div className="space-y-6 px-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DashboardTabs />
          <BereichSwitcher aktiv={scope} erlaubt={erlaubteScopes(a)} />
        </div>
        <EingeschaetztView rows={rows} beraterOptions={beraterOptions} isGf={isGf} />
      </div>
    </>
  );
}
