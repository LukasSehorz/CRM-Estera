// =====================================================================
// Partner & Tippgeber je Berater (V4.1 Kap. 8) — die „einfachere" Variante
// des GF-Teamsystems, auf die eigene Downline beschränkt.
//   • „Meine Partner" (8.1): Downline-Tabelle mit Abschlüssen, Pipeline,
//     Provision des Partners und meinem Overhead daraus (Differenz-Modell).
//   • „Meine Tippgeber" (8.3): wie viel läuft über Tippgeber, inkl. Anteil,
//     der vom eigenen Berater-Anteil abgeht (Vorgabe Lukas).
// =====================================================================
import type { AnalyticsData } from "@/lib/analytics";
import { isOpen, isWon, betragOf } from "@/lib/analytics";
import {
  dealBeraterProvision,
  dealOverheadFuerUpline,
  dealTippgeberAnteil,
} from "@/lib/provision";

export type PartnerRow = {
  partnerId: string;
  name: string;
  aktiv: boolean;
  abschluesse: number;
  pipelineVolumen: number;
  provision: number; // Provision des Partners (dessen eigener Anteil)
  overhead: number; // mein Overhead daraus
};

export function meinePartner(a: AnalyticsData, beraterId: string): PartnerRow[] {
  const rows: PartnerRow[] = [];
  for (const partnerId of a.downlineOf(beraterId)) {
    const deals = a.deals.filter((d) => d.berater_id === partnerId);
    let abschluesse = 0;
    let pipelineVolumen = 0;
    let provision = 0;
    let overhead = 0;
    let aktiv = false;
    for (const d of deals) {
      if (isOpen(d, a.sMap)) {
        pipelineVolumen += betragOf(d);
        aktiv = true;
      }
      if (a.istRealisiert(d)) {
        abschluesse += 1;
        provision += dealBeraterProvision(d, a.stufeOf(partnerId));
        overhead += dealOverheadFuerUpline(
          d,
          a.stufeOf(beraterId),
          a.immoDefaultOf(beraterId),
          a.stufeOf(partnerId),
        );
      }
    }
    rows.push({
      partnerId,
      name: a.nameOf(partnerId),
      aktiv,
      abschluesse,
      pipelineVolumen,
      provision,
      overhead,
    });
  }
  return rows.sort((x, y) => y.overhead - x.overhead);
}

export type TippgeberRow = {
  name: string;
  anzahlLeads: number;
  gewonnen: number;
  provision: number; // meine Provision aus diesen (gewonnenen) Deals
  tippgeberAnteil: number; // was der Tippgeber davon bekommt
};

export function meineTippgeber(
  a: AnalyticsData,
  beraterId: string,
): TippgeberRow[] {
  const map = new Map<string, TippgeberRow>();
  for (const d of a.deals) {
    if (d.berater_id !== beraterId || d.bereich !== "vv") continue;
    const name = (d.tippgeber ?? "").trim();
    if (!name) continue;
    const row =
      map.get(name) ??
      { name, anzahlLeads: 0, gewonnen: 0, provision: 0, tippgeberAnteil: 0 };
    row.anzahlLeads += 1;
    if (a.istRealisiert(d)) {
      row.gewonnen += 1;
      row.provision += dealBeraterProvision(d, a.stufeOf(beraterId));
      row.tippgeberAnteil += dealTippgeberAnteil(d);
    }
    map.set(name, row);
  }
  return [...map.values()].sort((x, y) => y.provision - x.provision);
}
