// =====================================================================
// VV-Provisionslogik (Fachkonzept Teil 2) — zentrale Single Source of Truth.
// Wird von Deal-Formular (Live-Vorschau), Deal-Detail (Aufschlüsselung) und
// den Listen (Einbehalt) genutzt. Keine Werte werden gespeichert; alles wird
// aus den Eingabefeldern + der (admin-gesetzten) Vertriebler-Stufe berechnet.
//
// Selbsttest (Fachkonzept 2.3, Beispiel A):
//   BWS = 100 × 12 × 40                = 48.000,00 €
//   Grundprovision = 48.000 × 7,8 %    =  3.744,00 €
//   nach Factoring = 3.744 × 90 %      =  3.369,60 €
//   Tippgeber 10 % = 3.369,60 × 10 %   =    336,96 €
//   Vertriebler 30 % = 3.369,60 × 30 % =  1.010,88 €
//   Hausanteil (Rest)                  =  2.021,76 €
// =====================================================================

export const PROVISIONSSATZ = 0.078; // 7,8 % (global fix, Fachkonzept 2.2)
export const FACTORING_ANTEIL = 0.9; // 90 % (10 % Factoringgebühr)
export const EINBEHALT_SOFORT = 0.85; // 85 % sofort (Option ohne Factoring)
export const EINBEHALT_REST = 0.15; // 15 % einbehalten
export const EINBEHALT_MONATE = 12; // Auszahlung nach 12 Monaten
export const RATIERLICH_MONATE = 60; // ratierlich: auf 60 Monate verteilt

export type ProvisionInput = {
  bws: number | null;
  sparbeitrag?: number | null;
  anzahlJahre?: number | null;
  factoring: boolean;
  tippgeberSatz?: number | null; // Prozent, z. B. 10
  vertrieblerStufe?: number | null; // Prozent, z. B. 30
  ratierlich?: boolean | null;
};

export type ProvisionResult = {
  bws: number;
  grundprovision: number;
  nettoProvision: number; // Bemessungsgrundlage der Aufteilung
  tippgeberAnteil: number;
  vertrieblerAnteil: number;
  hausAnteil: number;
  einbehalt: boolean; // true = Option ohne Factoring (85/15)
  sofortAuszahlung: number | null;
  einbehaltBetrag: number | null;
  ratierlich: boolean;
  monatsrate: number | null;
};

/** BWS = Sparbeitrag × 12 × Anzahl Jahre. */
export function computeBWS(
  sparbeitrag: number | null | undefined,
  jahre: number | null | undefined,
): number | null {
  if (sparbeitrag == null || jahre == null) return null;
  return sparbeitrag * 12 * jahre;
}

export function computeProvision(input: ProvisionInput): ProvisionResult {
  const bws = input.bws ?? computeBWS(input.sparbeitrag, input.anzahlJahre) ?? 0;
  const grundprovision = bws * PROVISIONSSATZ;

  // Netto-Provision = Bemessungsgrundlage der Aufteilung:
  //   mit Factoring  -> 90 % der Grundprovision (10 % Gebühr)
  //   ohne Factoring -> volle Grundprovision (davon werden 15 % einbehalten)
  const nettoProvision = input.factoring
    ? grundprovision * FACTORING_ANTEIL
    : grundprovision;

  const tSatz = (input.tippgeberSatz ?? 0) / 100;
  const vStufe = (input.vertrieblerStufe ?? 0) / 100;
  const tippgeberAnteil = nettoProvision * tSatz;
  const vertrieblerAnteil = nettoProvision * vStufe;
  const hausAnteil = nettoProvision - vertrieblerAnteil - tippgeberAnteil;

  const einbehalt = !input.factoring;
  const sofortAuszahlung = einbehalt ? nettoProvision * EINBEHALT_SOFORT : null;
  const einbehaltBetrag = einbehalt ? nettoProvision * EINBEHALT_REST : null;

  const ratierlich = !!input.ratierlich;
  const monatsrate = ratierlich ? nettoProvision / RATIERLICH_MONATE : null;

  return {
    bws,
    grundprovision,
    nettoProvision,
    tippgeberAnteil,
    vertrieblerAnteil,
    hausAnteil,
    einbehalt,
    sofortAuszahlung,
    einbehaltBetrag,
    ratierlich,
    monatsrate,
  };
}

// =====================================================================
// Immobilien-Provision (Schleife 2, Kap. 1.5) — Satz variabel je Deal.
// OFFEN #2 (Sebastian): Ist der Berater-Anteil ein Prozentsatz vom
// Kaufpreis oder von der Estera-Provision? Bis zur Antwort gilt der
// Default "anteil_von_provision" (analog VV) — nur diese Konstante
// umstellen, alle Anzeigen rechnen dann automatisch richtig.
// =====================================================================
export type ImmoProvisionModus = "anteil_von_provision" | "anteil_von_kaufpreis";
export const IMMO_PROVISION_MODUS: ImmoProvisionModus = "anteil_von_provision";

export type ImmoProvisionResult = {
  esteraProvision: number; // Kaufpreis × Satz — der Estera-Umsatz des Deals
  beraterProvision: number;
  hausAnteil: number; // Estera-Provision − Berater-Anteil
};

export function computeImmoProvision(
  kaufpreis: number | null | undefined,
  provisionssatz: number | null | undefined,
  beraterAnteil: number | null | undefined,
): ImmoProvisionResult {
  const kp = kaufpreis ?? 0;
  const esteraProvision = kp * ((provisionssatz ?? 0) / 100);
  const basis =
    IMMO_PROVISION_MODUS === "anteil_von_kaufpreis" ? kp : esteraProvision;
  const beraterProvision = basis * ((beraterAnteil ?? 0) / 100);
  return {
    esteraProvision,
    beraterProvision,
    hausAnteil: esteraProvision - beraterProvision,
  };
}

// =====================================================================
// Zentrale Deal-Größen (Schleife 2, Kap. 1.1: Volumen ≠ Umsatz).
// Single Source of Truth für ALLE Dashboards, Listen und KPIs:
//   dealVolumen          Transaktionsvolumen (Kaufpreis bzw. BWS)
//   dealEsteraUmsatz     was Estera verdient (GF-Sicht)
//   dealBeraterProvision was der Berater verdient (Berater-Sicht)
// VV-Estera-Umsatz nach Kette 6.2: Netto-Provision × (100 % − Stufe);
// der Tippgeber wird bewusst NICHT verrechnet (OFFEN #4, separater Abzug).
// =====================================================================
export type DealFinanz = {
  bereich: "immobilien" | "vv";
  kaufpreis: number | null;
  bws: number | null;
  factoring: boolean | null;
  provisionssatz: number | null;
  berater_anteil: number | null;
};

export function dealVolumen(d: DealFinanz): number {
  return d.bereich === "immobilien" ? (d.kaufpreis ?? 0) : (d.bws ?? 0);
}

export function dealEsteraUmsatz(
  d: DealFinanz,
  vertrieblerStufe: number | null | undefined,
): number {
  if (d.bereich === "immobilien") {
    return computeImmoProvision(d.kaufpreis, d.provisionssatz, d.berater_anteil)
      .esteraProvision;
  }
  const netto = (d.bws ?? 0) * PROVISIONSSATZ * (d.factoring ? FACTORING_ANTEIL : 1);
  return netto * (1 - (vertrieblerStufe ?? 0) / 100);
}

export function dealBeraterProvision(
  d: DealFinanz,
  vertrieblerStufe: number | null | undefined,
): number {
  if (d.bereich === "immobilien") {
    return computeImmoProvision(d.kaufpreis, d.provisionssatz, d.berater_anteil)
      .beraterProvision;
  }
  const netto = (d.bws ?? 0) * PROVISIONSSATZ * (d.factoring ? FACTORING_ANTEIL : 1);
  return netto * ((vertrieblerStufe ?? 0) / 100);
}

/** Fälligkeit des Einbehalts = Basisdatum (Abschluss, sonst Anlage) + 12 Monate. */
export function einbehaltFaelligAm(basisISO: string | null | undefined): string | null {
  if (!basisISO) return null;
  const d = new Date(basisISO);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + EINBEHALT_MONATE);
  return d.toISOString();
}
