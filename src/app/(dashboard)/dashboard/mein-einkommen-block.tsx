import { computeGehalt } from "@/lib/gehalt";
import { karriereFortschritt } from "@/config/karriere";
import type { AnalyticsData } from "@/lib/analytics";
import { MeinEinkommen } from "./mein-einkommen";

/**
 * Server-Wrapper für „Mein Einkommen" (7.3/7.4): rechnet Karriere-Fortschritt
 * und Gehalts-Bausteine aus den (RLS-gefilterten) Analytics und rendert die
 * Client-Ansicht. Genutzt im Berater-Dashboard UND im GF-Drilldown.
 */
export function MeinEinkommenBlock({
  a,
  beraterId,
  zeigeKarriere,
}: {
  a: AnalyticsData;
  beraterId: string;
  zeigeKarriere: boolean;
}) {
  const now = new Date();
  const fensterStart = a.fensterStartOf(beraterId);
  const gehalt = computeGehalt(a, beraterId, now, fensterStart);
  const f = karriereFortschritt(
    a.stufeOf(beraterId),
    fensterStart,
    gehalt.bwsImFenster,
    now,
  );

  return (
    <MeinEinkommen
      zeigeKarriere={zeigeKarriere}
      karriere={{
        aktuellStufe: f.aktuell.stufe,
        aktuellRang: f.aktuell.rang,
        aktuellAnteil: f.aktuell.anteil,
        naechsterRang: f.naechster?.rang ?? null,
        naechsterAnteil: f.naechster?.anteil ?? null,
        restBws: f.restBws,
        fortschrittPct: f.fortschrittPct,
        restTage: f.restTage,
        fensterAbgelaufen: f.fensterAbgelaufen,
        bwsImFenster: f.bwsImFenster,
      }}
      gehalt={{
        sofort: gehalt.sofort,
        einbehaltSumme: gehalt.einbehaltSumme,
        einbehaltKalender: gehalt.einbehaltKalender,
        ratierlichMonatlich: gehalt.ratierlichMonatlich,
        ratierlichRestsumme: gehalt.ratierlichRestsumme,
        ratierlichPosten: gehalt.ratierlichPosten,
        overheadSumme: gehalt.overheadSumme,
        overheadPosten: gehalt.overheadPosten,
      }}
    />
  );
}
