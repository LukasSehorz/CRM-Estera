// =====================================================================
// VV-Provisionslogik — Single Source of Truth (V4.1, Kap. 7.1).
// Drei Fälle (Call SJ F1.4): Einbehalt 85/15 bei Factoring UND ohne Factoring;
// nur ratierlich hat keinen Einbehalt. Unterschied Factoring/ohne = die Basis.
//   1 · factoring       Grundprov × 90 % × Stufe → 85 % sofort, 15 % nach 12 Mon.
//   2 · ohne_factoring  Grundprov × 100 % × Stufe → 85 % sofort, 15 % nach 12 Mon.
//   3 · ratierlich      Grundprov × 100 % × Stufe → ÷ 60, monatlich über 5 Jahre
//
// Tippgeber (Vorgabe Lukas, 12.07.2026): der Tippgeber-Satz geht vom
// BERATER-Anteil ab, nicht vom Hausanteil. Berater 40 %, Tippgeber 10 %
// → Umsatz des Beraters = 40 % × Basis, „Gewinn" = 30 % × Basis.
// Der Estera-/Hausanteil = Basis × (100 % − Stufe) bleibt unberührt.
//
// Selbsttest (Beispiel aus dem Dokument: BWS 48.000 €, Consultant 40 %):
//   Grundprovision 7,8 %             = 3.744,00 €
//   Fall 1: × 90 % = 3.369,60 → × 40 % = 1.347,84 → sofort 1.145,66 / Einbehalt 202,18
//   Fall 2: × 100 % = 3.744,00 → × 40 % = 1.497,60 → sofort 1.272,96 / Einbehalt 224,64
//   Fall 3: × 100 % = 3.744,00 → × 40 % = 1.497,60 → ÷ 60 = 24,96 €/Monat
// =====================================================================

export const PROVISIONSSATZ = 0.078; // 7,8 % (global fix)
export const FACTORING_ANTEIL = 0.9; // 90 % (10 % Factoringgebühr)
export const EINBEHALT_SOFORT = 0.85; // 85 % sofort (Factoring & ohne Factoring)
export const EINBEHALT_REST = 0.15; // 15 % einbehalten (Factoring & ohne Factoring)
export const EINBEHALT_MONATE = 12; // Auszahlung 12 Monate nach Abschluss
export const RATIERLICH_MONATE = 60; // ratierlich: 60 Monatsraten (5 Jahre)
export const MAX_ANZAHL_JAHRE = 40; // 7.5: BWS-Laufzeit ist auf 40 Jahre begrenzt

/** Zahlart eines VV-Deals (deals.vv_zahlart). */
export type VvZahlart = "factoring" | "ohne_factoring" | "ratierlich";

export const VV_ZAHLARTEN: { value: VvZahlart; label: string; hinweis: string }[] = [
  {
    value: "factoring",
    label: "Mit Factoring (Normalfall)",
    hinweis: "90 % Basis · 85 % sofort · 15 % Einbehalt (nach 12 Monaten)",
  },
  {
    value: "ohne_factoring",
    label: "Ohne Factoring",
    hinweis: "100 % Basis · 85 % sofort · 15 % Einbehalt (nach 12 Monaten)",
  },
  {
    value: "ratierlich",
    label: "Ratierlich",
    hinweis: "100 % Basis · kein Einbehalt · Auszahlung ÷ 60 Monate",
  },
];

/** Alt-Flags (factoring/ratierlich) → Zahlart, solange Altdaten existieren. */
export function zahlartOf(d: {
  vv_zahlart?: string | null;
  factoring?: boolean | null;
  ratierlich?: boolean | null;
}): VvZahlart {
  if (d.vv_zahlart === "factoring" || d.vv_zahlart === "ohne_factoring" || d.vv_zahlart === "ratierlich") {
    return d.vv_zahlart;
  }
  if (d.ratierlich) return "ratierlich";
  return d.factoring ? "factoring" : "ohne_factoring";
}

export type ProvisionInput = {
  bws: number | null;
  sparbeitrag?: number | null;
  anzahlJahre?: number | null;
  zahlart: VvZahlart;
  tippgeberSatz?: number | null; // Prozent, z. B. 10
  vertrieblerStufe?: number | null; // Prozent, z. B. 40
};

export type ProvisionResult = {
  bws: number;
  grundprovision: number; // BWS × 7,8 %
  nettoProvision: number; // Basis nach Factoring (× 90 % nur bei Factoring)
  vertrieblerGesamt: number; // Basis × Stufe — der „Umsatz" des Beraters
  tippgeberAnteil: number; // Basis × Tippgeber-Satz — geht vom Berater-Anteil ab
  vertrieblerGewinn: number; // Gesamt − Tippgeber — Bemessung der Auszahlung
  hausAnteil: number; // Basis × (100 % − Stufe) — Estera-Anteil des Deals
  einbehalt: boolean; // true NUR bei Zahlart „factoring"
  sofortAuszahlung: number | null; // Fall 1: 85 % des Gewinns · Fall 2: voll
  einbehaltBetrag: number | null; // Fall 1: 15 % des Gewinns · sonst null
  ratierlich: boolean;
  monatsrate: number | null; // Fall 3: Gewinn ÷ 60
};

/** BWS = Sparbeitrag × 12 × Anzahl Jahre (Jahre ≤ 40, s. MAX_ANZAHL_JAHRE). */
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
  const mitFactoring = input.zahlart === "factoring";
  const nettoProvision = mitFactoring
    ? grundprovision * FACTORING_ANTEIL
    : grundprovision;

  const vStufe = (input.vertrieblerStufe ?? 0) / 100;
  const tSatz = (input.tippgeberSatz ?? 0) / 100;
  const vertrieblerGesamt = nettoProvision * vStufe;
  const tippgeberAnteil = nettoProvision * tSatz;
  const vertrieblerGewinn = vertrieblerGesamt - tippgeberAnteil;
  const hausAnteil = nettoProvision - vertrieblerGesamt;

  // Einbehalt 85/15 bei Factoring UND ohne Factoring; nur ratierlich ohne
  // Einbehalt (Call SJ F1.4). Der Unterschied liegt allein in nettoProvision
  // (× 90 % mit Factoring, × 100 % ohne).
  const ratierlich = input.zahlart === "ratierlich";
  const einbehalt = !ratierlich;
  const sofortAuszahlung = ratierlich
    ? null
    : vertrieblerGewinn * EINBEHALT_SOFORT;
  const einbehaltBetrag = einbehalt ? vertrieblerGewinn * EINBEHALT_REST : null;
  const monatsrate = ratierlich ? vertrieblerGewinn / RATIERLICH_MONATE : null;

  return {
    bws,
    grundprovision,
    nettoProvision,
    vertrieblerGesamt,
    tippgeberAnteil,
    vertrieblerGewinn,
    hausAnteil,
    einbehalt,
    sofortAuszahlung,
    einbehaltBetrag,
    ratierlich,
    monatsrate,
  };
}

// =====================================================================
// Immobilien-Provision (Kap. 1.5) — Satz variabel je Deal.
// FESTGELEGT (Call SJ F3): Der Berater-Anteil wird IMMER vom KAUFPREIS
// gerechnet. Der Modus-Umschalter entfällt; die Konstante bleibt als Default.
// Retainer-Modell (8.4, ZUKUNFT) dockt später am per-Deal-Anteil an.
// =====================================================================
export type ImmoProvisionModus = "anteil_von_provision" | "anteil_von_kaufpreis";
export const IMMO_PROVISION_MODUS: ImmoProvisionModus = "anteil_von_kaufpreis";

export type ImmoProvisionResult = {
  esteraProvision: number; // Kaufpreis × Satz — der Estera-Umsatz des Deals
  beraterProvision: number;
  hausAnteil: number; // Estera-Provision − Berater-Anteil
};

export function computeImmoProvision(
  kaufpreis: number | null | undefined,
  provisionssatz: number | null | undefined,
  beraterAnteil: number | null | undefined,
  modus: ImmoProvisionModus = IMMO_PROVISION_MODUS,
): ImmoProvisionResult {
  const kp = kaufpreis ?? 0;
  const esteraProvision = kp * ((provisionssatz ?? 0) / 100);
  const basis = modus === "anteil_von_kaufpreis" ? kp : esteraProvision;
  const beraterProvision = basis * ((beraterAnteil ?? 0) / 100);
  return {
    esteraProvision,
    beraterProvision,
    hausAnteil: esteraProvision - beraterProvision,
  };
}

// =====================================================================
// Zentrale Deal-Größen (Kap. 1.1/1.2: Volumen ≠ Umsatz).
//   dealVolumen          Transaktionsvolumen (Kaufpreis bzw. BWS)
//   dealEsteraUmsatz     kanonischer Estera-Umsatz = Estera-NETTO (GF-Sicht,
//                        Kap. 1.1: „realisierte Estera-Provision, Estera-Netto")
//   dealBeraterProvision was der Berater UMSETZT (Basis × Stufe)
//   dealBeraterGewinn    Umsatz − Tippgeber-Anteil (Vorgabe Lukas)
// =====================================================================
export type DealFinanz = {
  bereich: "immobilien" | "vv";
  kaufpreis: number | null;
  bws: number | null;
  factoring: boolean | null;
  vv_zahlart?: string | null;
  ratierlich?: boolean | null;
  tippgeber_satz?: number | null;
  provisionssatz: number | null;
  berater_anteil: number | null;
};

function vvBasis(d: DealFinanz): number {
  const mitFactoring = zahlartOf(d) === "factoring";
  return (d.bws ?? 0) * PROVISIONSSATZ * (mitFactoring ? FACTORING_ANTEIL : 1);
}

export function dealVolumen(d: DealFinanz): number {
  return d.bereich === "immobilien" ? (d.kaufpreis ?? 0) : (d.bws ?? 0);
}

export function dealEsteraUmsatz(
  d: DealFinanz,
  vertrieblerStufe: number | null | undefined,
  modus: ImmoProvisionModus = IMMO_PROVISION_MODUS,
): number {
  // Kanonische Umsatz-Definition (Kap. 1.1): Umsatz = Estera-NETTO, also der
  // Hausanteil NACH Abzug des Berater-Anteils. Immobilien liefert daher den
  // hausAnteil (nicht die volle esteraProvision — die ist „Provision brutto"
  // und steckt in der Summen-Skala als „Summe X"). VV ist über
  // (1 − Stufe %) bereits netto — damit stimmen GF-Umsatz und Estera-Netto
  // überein (keine Zwitter-Zahl mehr).
  if (d.bereich === "immobilien") {
    return computeImmoProvision(d.kaufpreis, d.provisionssatz, d.berater_anteil, modus)
      .hausAnteil;
  }
  return vvBasis(d) * (1 - (vertrieblerStufe ?? 0) / 100);
}

export function dealBeraterProvision(
  d: DealFinanz,
  vertrieblerStufe: number | null | undefined,
  modus: ImmoProvisionModus = IMMO_PROVISION_MODUS,
): number {
  if (d.bereich === "immobilien") {
    return computeImmoProvision(d.kaufpreis, d.provisionssatz, d.berater_anteil, modus)
      .beraterProvision;
  }
  return vvBasis(d) * ((vertrieblerStufe ?? 0) / 100);
}

/** Berater-„Gewinn" = eigener Umsatz − Tippgeber-Abgabe (nur VV-Tippgeber). */
export function dealBeraterGewinn(
  d: DealFinanz,
  vertrieblerStufe: number | null | undefined,
  modus: ImmoProvisionModus = IMMO_PROVISION_MODUS,
): number {
  const umsatz = dealBeraterProvision(d, vertrieblerStufe, modus);
  if (d.bereich !== "vv") return umsatz;
  return umsatz - vvBasis(d) * ((d.tippgeber_satz ?? 0) / 100);
}

/** Tippgeber-Anteil eines Deals (geht vom Berater-Anteil ab). */
export function dealTippgeberAnteil(d: DealFinanz): number {
  if (d.bereich !== "vv") return 0;
  return vvBasis(d) * ((d.tippgeber_satz ?? 0) / 100);
}

// =====================================================================
// Overhead (Kap. 8, Modell Lukas 12.07.2026): Overhead = DIFFERENZ der
// Anbindungen, auf derselben Basis wie der Anteil des Partners.
//   VV:   (Upline-Stufe − Partner-Stufe) % × VV-Basis des Partner-Deals
//   Immo: (Upline-Immo-Default − Partner-Anteil des Deals) % × Immo-Basis
// Beispiel Fred: Immo 7 %/VV 50 %, Partner 5 %/40 % → 2 % bzw. 10 %.
// Der Overhead kommt aus dem Hausanteil, dem Partner wird nichts abgezogen
// (ANNAHME 8.2 — von Sebastian gegenzuprüfen).
// =====================================================================
export function dealOverheadFuerUpline(
  d: DealFinanz,
  uplineVvStufe: number | null | undefined,
  uplineImmoDefault: number | null | undefined,
  partnerVvStufe: number | null | undefined,
  modus: ImmoProvisionModus = IMMO_PROVISION_MODUS,
): number {
  if (d.bereich === "vv") {
    const diff = Math.max(0, (uplineVvStufe ?? 0) - (partnerVvStufe ?? 0));
    return vvBasis(d) * (diff / 100);
  }
  const esteraProvision = (d.kaufpreis ?? 0) * ((d.provisionssatz ?? 0) / 100);
  const basis =
    modus === "anteil_von_kaufpreis" ? (d.kaufpreis ?? 0) : esteraProvision;
  const diff = Math.max(0, (uplineImmoDefault ?? 0) - (d.berater_anteil ?? 0));
  return basis * (diff / 100);
}

/** Fälligkeit des Einbehalts = Basisdatum (Abschluss, sonst Anlage) + 12 Monate. */
export function einbehaltFaelligAm(basisISO: string | null | undefined): string | null {
  if (!basisISO) return null;
  const d = new Date(basisISO);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + EINBEHALT_MONATE);
  return d.toISOString();
}
