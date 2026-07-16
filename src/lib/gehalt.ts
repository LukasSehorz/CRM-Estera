// =====================================================================
// „Mein Gehalt" (V4.1 Kap. 7.4) — reales Einkommen eines Beraters, nicht nur
// Papier-Provision. Vier Bausteine:
//   • Sofort ausgezahlt (85 %-Anteil bzw. voll, je realisierter Periode)
//   • Einbehalt gesammelt + Auszahlungskalender (je 12 Monate nach Abschluss)
//   • Passiv (ratierlich): laufende Monatsraten, Restlaufzeit & Restsumme
//   • Overhead aus Partnern (Downline, Differenz-Modell 8.2)
// Alles aus AnalyticsData abgeleitet (RLS-gefiltert) — keine Zusatz-Queries.
// =====================================================================
import type { AnalyticsData, Deal } from "@/lib/analytics";
import {
  branchChildTowards,
  computeProvision,
  dealBeraterProvision,
  dealBeraterGewinn,
  dealOverheadFuerUpline,
  einbehaltFaelligAm,
  zahlartOf,
  EINBEHALT_REST,
  RATIERLICH_MONATE,
  type ImmoProvisionModus,
} from "@/lib/provision";

export type EinbehaltPosten = {
  dealId: string;
  dealname: string;
  betrag: number;
  faelligISO: string | null;
};
export type RatierlichPosten = {
  dealId: string;
  dealname: string;
  monatsrate: number;
  restMonate: number;
  restsumme: number;
};
export type OverheadPosten = {
  partnerId: string;
  partnerName: string;
  betrag: number;
  deals: number;
};
/** Einzelner sofort ausgezahlter Deal — für die Aufschlüsselung (Feedback SJ). */
export type SofortPosten = {
  dealId: string;
  dealname: string;
  bereich: "immobilien" | "vv";
  betrag: number;
  /** Buchungsdatum (Immo: Notartermin, VV: Policierung). */
  amISO: string;
  /** In welchen Perioden zählt der Posten? */
  periode: { monat: boolean; quartal: boolean; jahr: boolean };
};

export type GehaltDaten = {
  sofort: { monat: number; quartal: number; jahr: number; gesamt: number };
  sofortPosten: SofortPosten[];
  einbehaltSumme: number;
  einbehaltKalender: EinbehaltPosten[];
  ratierlichMonatlich: number;
  ratierlichRestsumme: number;
  ratierlichPosten: RatierlichPosten[];
  overheadSumme: number;
  overheadPosten: OverheadPosten[];
  /** BWS der im aktuellen Karriere-Fenster policierten VV-Deals (7.3). */
  bwsImFenster: number;
};

function monateSeit(vonISO: string, now: Date): number {
  const von = new Date(vonISO);
  return (
    (now.getFullYear() - von.getFullYear()) * 12 +
    (now.getMonth() - von.getMonth())
  );
}

/** Sofort ausgezahlter Berater-Anteil eines realisierten Deals. */
function sofortBetrag(d: Deal, stufe: number, modus: ImmoProvisionModus): number {
  if (d.bereich === "immobilien") return dealBeraterProvision(d, stufe, modus);
  const z = zahlartOf(d);
  if (z === "ratierlich") return 0; // läuft über die Monatsraten
  // F1.4: 85 % sofort — Einbehalt gilt mit UND ohne Factoring.
  return dealBeraterGewinn(d, stufe) * (1 - EINBEHALT_REST);
}

export function computeGehalt(
  a: AnalyticsData,
  beraterId: string,
  now: Date,
  fensterStartISO: string,
): GehaltDaten {
  const stufe = a.stufeOf(beraterId);
  const meine = a.deals.filter((d) => d.berater_id === beraterId);

  const sofort = { monat: 0, quartal: 0, jahr: 0, gesamt: 0 };
  const sofortPosten: SofortPosten[] = [];
  const einbehaltKalender: EinbehaltPosten[] = [];
  const ratierlichPosten: RatierlichPosten[] = [];
  let bwsImFenster = 0;
  const fensterStart = new Date(fensterStartISO).getTime();

  for (const d of meine) {
    if (!a.istRealisiert(d)) continue;
    const amISO = a.realisiertAm(d);
    if (!amISO) continue;
    const am = new Date(amISO);

    // Sofort-Auszahlung nach Periode (Buchungsdatum).
    const betrag = sofortBetrag(d, stufe, a.immoModus);
    sofort.gesamt += betrag;
    const imJahr = am.getFullYear() === now.getFullYear();
    const imQuartal =
      imJahr && Math.floor(am.getMonth() / 3) === Math.floor(now.getMonth() / 3);
    const imMonat = imJahr && am.getMonth() === now.getMonth();
    if (imJahr) {
      sofort.jahr += betrag;
      if (imQuartal) sofort.quartal += betrag;
      if (imMonat) sofort.monat += betrag;
    }
    if (betrag > 0)
      sofortPosten.push({
        dealId: d.id,
        dealname: d.dealname,
        bereich: d.bereich,
        betrag,
        amISO,
        periode: { monat: imMonat, quartal: imQuartal, jahr: imJahr },
      });

    if (d.bereich === "vv") {
      const z = zahlartOf(d);
      // Karriere-Fenster: BWS der im Fenster policierten VV-Deals.
      if (am.getTime() >= fensterStart) bwsImFenster += d.bws ?? 0;

      if (z !== "ratierlich") {
        // 15 % Einbehalt (Factoring UND ohne Factoring, F1.4), fällig
        // 12 Monate nach Abschluss.
        const betragEinb = dealBeraterGewinn(d, stufe) * EINBEHALT_REST;
        if (betragEinb > 0)
          einbehaltKalender.push({
            dealId: d.id,
            dealname: d.dealname,
            betrag: betragEinb,
            faelligISO: einbehaltFaelligAm(amISO),
          });
      } else if (z === "ratierlich") {
        const prov = computeProvision({
          bws: d.bws,
          zahlart: "ratierlich",
          tippgeberSatz: d.tippgeber_satz,
          vertrieblerStufe: stufe,
        });
        const rate = prov.monatsrate ?? 0;
        const vergangen = Math.max(0, Math.min(RATIERLICH_MONATE, monateSeit(amISO, now)));
        const restMonate = Math.max(0, RATIERLICH_MONATE - vergangen);
        ratierlichPosten.push({
          dealId: d.id,
          dealname: d.dealname,
          monatsrate: rate,
          restMonate,
          restsumme: rate * restMonate,
        });
      }
    }
  }

  // Overhead aus der Downline (8.2 + Kaskade 3.7): Differenzmodell über ALLE
  // Ebenen — je Deal zählt das direkte Kind auf dem Pfad zum Abschluss-Berater
  // (Branch-Anker); ausgewiesen wird je direktem Partner-Ast.
  const posten = new Map<string, OverheadPosten>();
  for (const d of a.deals) {
    if (!a.istRealisiert(d)) continue;
    const anker = branchChildTowards(a.parentOf, beraterId, d.berater_id);
    if (!anker) continue;
    const eigenerDeal = d.berater_id === anker;
    const oh = dealOverheadFuerUpline(
      d,
      a.stufeOf(beraterId),
      a.immoDefaultOf(beraterId),
      a.stufeOf(anker),
      a.immoModus,
      eigenerDeal ? undefined : a.immoDefaultOf(anker),
    );
    if (oh <= 0) continue;
    const row =
      posten.get(anker) ??
      { partnerId: anker, partnerName: a.nameOf(anker), betrag: 0, deals: 0 };
    row.betrag += oh;
    row.deals++;
    posten.set(anker, row);
  }
  const overheadPosten = [...posten.values()].sort((x, y) => y.betrag - x.betrag);

  einbehaltKalender.sort((x, y) =>
    (x.faelligISO ?? "").localeCompare(y.faelligISO ?? ""),
  );

  sofortPosten.sort((x, y) => y.amISO.localeCompare(x.amISO));

  return {
    sofort,
    sofortPosten,
    einbehaltSumme: einbehaltKalender.reduce((s, e) => s + e.betrag, 0),
    einbehaltKalender,
    ratierlichMonatlich: ratierlichPosten.reduce(
      (s, r) => s + (r.restMonate > 0 ? r.monatsrate : 0),
      0,
    ),
    ratierlichRestsumme: ratierlichPosten.reduce((s, r) => s + r.restsumme, 0),
    ratierlichPosten,
    overheadSumme: overheadPosten.reduce((s, o) => s + o.betrag, 0),
    overheadPosten,
    bwsImFenster,
  };
}
