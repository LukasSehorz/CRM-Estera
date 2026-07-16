import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { ContactForm, type FormState } from "../contact-form";
import type { DocType } from "../document-checklist";

export default async function NeuerKontaktPage() {
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

  let beraterOptions: { id: string; name: string }[] = [];
  if (isGf) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, vorname, nachname, aktiv")
      .eq("aktiv", true)
      .order("vorname");
    beraterOptions = (profs ?? []).map((p) => ({
      id: p.id,
      name: `${p.vorname} ${p.nachname}`,
    }));
  }

  // Dokumenttypen für die Checkliste beim Anlegen (Immobilien-Kunden).
  const { data: docTypes } = await supabase
    .from("document_types")
    .select("id, gruppe, name, position")
    .eq("aktiv", true)
    .order("position");

  const initial: FormState = {
    vorname: "",
    nachname: "",
    email: "",
    telefon: "",
    berater_id: user.id,
    status: "Neu",
    termin_status: "Nicht vereinbart",
    leadquelle: "",
    interesse: [],
    nettoverdienst_monatlich: "",
    eigenkapital: "",
    einschaetzung: "ausstehend",
    eingeschaetzter_betrag: "",
    belegt_deal_id: "",
    unterlagen_vollstaendig: false,
    fehlende_unterlagen: "",
    finanzierungsstatus: "offen",
    ist_selbststaendig: false,
    ist_immobilienbesitzer: false,
    ist_bestandskunde: false,
  };

  return (
    <>
      <Topbar
        title="Neuer Kunde"
        subtitle="Lead oder Kunde anlegen"
        backHref="/kontakte"
      />
      <div className="px-6 py-6">
        <ContactForm
          mode="create"
          initial={initial}
          canAssignBerater={isGf}
          beraterOptions={beraterOptions}
          docTypes={(docTypes ?? []) as DocType[]}
        />
      </div>
    </>
  );
}
