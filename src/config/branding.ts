// =====================================================================
// Branding & White-Label (V4.1 Kap. 10) — zentrale Stelle für Firmenname,
// Claim, Logo und den White-Label-Schalter. Ein externer Vertrieb bekommt
// eine EIGENE Instanz (eigenes Deployment/eigene Supabase-DB); für dessen
// Instanz wird hier `WHITE_LABEL = true` gesetzt und ggf. Name/Logo/Farben
// getauscht. Estera-Interna (Rechenkette, Stufen, Overhead, Einbehalte,
// interne KPIs) werden dann über `zeigeInterneWerte()` ausgeblendet.
//
// Bewusst KEIN Multi-Mandanten-System in einer Instanz (Doku: docs/white-label.md).
// =====================================================================

export const BRANDING = {
  appName: "Estera CRM",
  claim: "Vertriebs-CRM",
  company: "Estera GmbH",
  /** Logo im /public-Ordner (pro Instanz austauschbar). */
  logoSrc: "/estera-logo.jpg",
  /** true = externe White-Label-Instanz: Estera-Interna ausblenden. */
  whiteLabel: false,
} as const;

/**
 * Ob interne Estera-Werte sichtbar sein dürfen (Rechenkette, Stufen,
 * Overhead, Einbehalte, interne Sätze/KPIs). In einer White-Label-Instanz
 * immer false — es darf kein interner Wert in eine externe Instanz
 * durchschlagen (Kap. 10, „lückenlose Trennung").
 */
export function zeigeInterneWerte(): boolean {
  return !BRANDING.whiteLabel;
}
