// =====================================================================
// Partner & Tippgeber je Berater (V4.1 Kap. 8) — die „einfachere" Variante
// des GF-Teamsystems, auf die eigene Downline beschränkt.
//   • „Meine Partner" (8.1): Downline-Tabelle mit Abschlüssen, Pipeline,
//     Provision des Partners und meinem Overhead daraus (Differenz-Modell).
//   • „Meine Tippgeber" (8.3): wie viel läuft über Tippgeber, inkl. Anteil,
//     der vom eigenen Berater-Anteil abgeht (Vorgabe Lukas).
// =====================================================================
import type { AnalyticsData } from "@/lib/analytics";
import { isOpen, betragOf } from "@/lib/analytics";
import {
  branchChildTowards,
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
  // Eigene Kennzahlen des Partners (Abschlüsse/Pipeline/Provision) bleiben
  // dessen eigene Deals; der Overhead kaskadiert über den GESAMTEN Ast
  // (Differenzmodell: meine Stufe − Stufe des direkten Kindes am Pfad).
  const rows = new Map<string, PartnerRow>(
    a.downlineOf(beraterId).map((partnerId) => [
      partnerId,
      {
        partnerId,
        name: a.nameOf(partnerId),
        aktiv: false,
        abschluesse: 0,
        pipelineVolumen: 0,
        provision: 0,
        overhead: 0,
      },
    ]),
  );
  for (const d of a.deals) {
    const anker = branchChildTowards(a.parentOf, beraterId, d.berater_id);
    if (!anker) continue;
    const row = rows.get(anker);
    if (!row) continue;
    const eigenerDeal = d.berater_id === anker;
    if (eigenerDeal && isOpen(d, a.sMap)) {
      row.pipelineVolumen += betragOf(d);
      row.aktiv = true;
    }
    if (a.istRealisiert(d)) {
      if (eigenerDeal) {
        row.abschluesse += 1;
        row.provision += dealBeraterProvision(d, a.stufeOf(anker), a.immoModus);
      }
      row.overhead += dealOverheadFuerUpline(
        d,
        a.stufeOf(beraterId),
        a.immoDefaultOf(beraterId),
        a.stufeOf(anker),
        a.immoModus,
        eigenerDeal ? undefined : a.immoDefaultOf(anker),
      );
    }
  }
  return [...rows.values()].sort((x, y) => y.overhead - x.overhead);
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
