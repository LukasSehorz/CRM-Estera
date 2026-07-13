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

export type GehaltDaten = {
  sofort: { monat: number; quartal: number; jahr: number; gesamt: number };
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
  const gewinn = dealBeraterGewinn(d, stufe);
  return z === "factoring" ? gewinn * (1 - EINBEHALT_REST) : gewinn; // 85 % bzw. voll
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
    if (am.getFullYear() === now.getFullYear()) {
      sofort.jahr += betrag;
      if (Math.floor(am.getMonth() / 3) === Math.floor(now.getMonth() / 3))
        sofort.quartal += betrag;
      if (am.getMonth() === now.getMonth()) sofort.monat += betrag;
    }

    if (d.bereich === "vv") {
      const z = zahlartOf(d);
      // Karriere-Fenster: BWS der im Fenster policierten VV-Deals.
      if (am.getTime() >= fensterStart) bwsImFenster += d.bws ?? 0;

      if (z === "factoring") {
        // 15 % Einbehalt, fällig 12 Monate nach Abschluss.
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

  // Overhead aus der Downline (8.2, Differenz-Modell): je direktem Partner
  // die Summe über dessen realisierte Deals.
  const overheadPosten: OverheadPosten[] = [];
  for (const partnerId of a.downlineOf(beraterId)) {
    let summe = 0;
    let anzahl = 0;
    for (const d of a.deals) {
      if (d.berater_id !== partnerId || !a.istRealisiert(d)) continue;
      const oh = dealOverheadFuerUpline(
        d,
        a.stufeOf(beraterId),
        a.immoDefaultOf(beraterId),
        a.stufeOf(partnerId),
        a.immoModus,
      );
      if (oh > 0) {
        summe += oh;
        anzahl++;
      }
    }
    if (summe > 0)
      overheadPosten.push({
        partnerId,
        partnerName: a.nameOf(partnerId),
        betrag: summe,
        deals: anzahl,
      });
  }
  overheadPosten.sort((x, y) => y.betrag - x.betrag);

  einbehaltKalender.sort((x, y) =>
    (x.faelligISO ?? "").localeCompare(y.faelligISO ?? ""),
  );

  return {
    sofort,
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
