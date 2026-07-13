// =====================================================================
// Globale CRM-Einstellungen (0014) — serverseitig gelesen, GF-gesetzt.
// Aktuell: Immo-Provisions-Modus (V4.1 Kap. 1.5). Der Wert steuert, worauf
// der Immobilien-Berater-Anteil % gerechnet wird (Estera-Provision vs.
// Kaufpreis). Fällt auf die Code-Konstante zurück, falls (noch) kein Wert
// in der DB steht.
// =====================================================================
import { createClient } from "@/lib/supabase/server";
import { IMMO_PROVISION_MODUS, type ImmoProvisionModus } from "@/lib/provision";

export const IMMO_MODUS_KEY = "immo_provision_modus";

function parseModus(value: string | null | undefined): ImmoProvisionModus {
  return value === "anteil_von_kaufpreis" || value === "anteil_von_provision"
    ? value
    : IMMO_PROVISION_MODUS;
}

/** Liest den Immo-Provisions-Modus (eigener Supabase-Client). */
export async function getImmoModus(): Promise<ImmoProvisionModus> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_einstellungen")
    .select("value")
    .eq("key", IMMO_MODUS_KEY)
    .maybeSingle();
  return parseModus(data?.value);
}

export { parseModus as parseImmoModus };
