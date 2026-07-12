import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { DashboardTabs } from "../dashboard-tabs";
import { EingeschaetztView, type EingRow } from "./eingeschaetzt-view";
import { loadAnalytics } from "@/lib/analytics";

export default async function EingeschaetztDashboardPage() {
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
  // 15.2: „Eingeschätzte Kunden" ausschließlich für Immobilien — in der VV
  // gibt es keine Finanzierungseinschätzung. Nur Kontakte, die bereits
  // bewertet wurden (nicht „ausstehend").
  const eligible = a.contacts.filter(
    (c) =>
      c.interesse.includes("immobilien") && c.einschaetzung !== "ausstehend",
  );

  const rows: EingRow[] = eligible.map((c) => ({
    id: c.id,
    name: `${c.vorname} ${c.nachname}`,
    beraterId: c.berater_id,
    berater: a.beraterMap.get(c.berater_id) ?? "—",
    einschaetzung: c.einschaetzung,
    betrag: c.eingeschaetzter_betrag ?? 0,
    belegt: c.belegt_deal_id != null,
  }));

  const beraterOptions = isGf
    ? [...a.beraterMap.entries()].map(([id, name]) => ({ id, name }))
    : [];

  return (
    <>
      <Topbar
        title="Eingeschätzte Kunden"
        subtitle="Immobilien-Leads mit Finanzierungseinschätzung · filterbar"
      />
      <div className="space-y-6 px-6 py-6">
        <DashboardTabs />
        <EingeschaetztView rows={rows} beraterOptions={beraterOptions} isGf={isGf} />
      </div>
    </>
  );
}
