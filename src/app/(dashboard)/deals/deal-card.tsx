import { FileCheck2, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEUR, formatEURCents } from "@/lib/format";
import { computeProvision, zahlartOf } from "@/lib/provision";
import type { HealthResult } from "@/lib/health";
import { Pill, objektStatusTone } from "@/components/ui/pill";

export type Bereich = "immobilien" | "vv";

export type BoardDeal = {
  id: string;
  dealname: string;
  berater_id: string;
  contact_id: string;
  stage_id: string;
  bereich: Bereich;
  kaufpreis: number | null;
  objekt_adresse: string | null;
  objekt_status: string | null;
  bws: number | null;
  factoring: boolean;
  vv_zahlart: string | null;
  ratierlich: boolean | null;
  tippgeber_satz: number | null;
  tippgeber: string | null;
  naechster_termin: string | null;
  updated_at: string;
  /** Dokumenten-Fortschritt des Kontakts (nur Immobilien, 3.1). */
  doks: { vorhanden: number; gesamt: number } | null;
  /** Health-Ampel (4.5); null bei Abschluss-/Verlustphasen. */
  health: HealthResult | null;
};

export type BoardStage = {
  id: string;
  name: string;
  position: number;
  wahrscheinlichkeit: number;
  is_won: boolean;
  is_lost: boolean;
};

/**
 * Inhalt einer Deal-Karte (bereichsabhängig). Bewusst ohne Drag-/Link-Logik,
 * damit dieselbe Darstellung in der Spalte UND im Drag-Overlay genutzt wird.
 */
export function DealCardContent({
  deal,
  beraterName,
}: {
  deal: BoardDeal;
  beraterName: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-1.5">
        {/* Health-Ampel (4.5) — Grund im Tooltip */}
        {deal.health && (
          <span
            title={deal.health.gruende.join(" · ")}
            className={cn(
              "mt-1 h-2.5 w-2.5 shrink-0 rounded-full",
              deal.health.health === "gruen" && "bg-success",
              deal.health.health === "gelb" && "bg-warning",
              deal.health.health === "rot" && "bg-danger",
            )}
          />
        )}
        <div className="line-clamp-2 text-sm font-medium leading-snug text-foreground">
          {deal.dealname}
        </div>
      </div>

      {deal.bereich === "immobilien" ? (
        <>
          {deal.kaufpreis != null && (
            <div className="text-sm font-semibold tabular-nums text-foreground">
              {formatEUR(deal.kaufpreis)}
            </div>
          )}
          {deal.objekt_adresse && (
            <div className="line-clamp-1 text-xs text-muted-foreground">
              {deal.objekt_adresse}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1">
            {deal.objekt_status && (
              <Pill tone={objektStatusTone(deal.objekt_status)}>
                {deal.objekt_status}
              </Pill>
            )}
            {deal.doks && (
              <Pill
                tone={
                  deal.doks.vorhanden === deal.doks.gesamt ? "success" : "muted"
                }
              >
                <FileCheck2 className="mr-0.5 h-3 w-3" />
                {deal.doks.vorhanden}/{deal.doks.gesamt}
              </Pill>
            )}
          </div>
        </>
      ) : (
        <>
          {deal.bws != null && (
            <div className="text-sm font-semibold tabular-nums text-foreground">
              {formatEUR(deal.bws)}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                BWS
              </span>
            </div>
          )}
          {deal.bws != null && (
            <div className="text-xs tabular-nums text-muted-foreground">
              Provision{" "}
              {formatEURCents(
                computeProvision({
                  bws: deal.bws,
                  zahlart: zahlartOf(deal),
                }).nettoProvision,
              )}
            </div>
          )}
          {/* Zahlart-Tags (7.1): bei Factoring greifen BEIDE — Factoring
              (90 %) UND Einbehalt (15 %). Ohne Factoring: voll sofort. */}
          <div className="flex flex-wrap gap-1">
            {(() => {
              const z = zahlartOf(deal);
              if (z === "ratierlich") return <Pill tone="info">ratierlich</Pill>;
              if (z === "factoring")
                return (
                  <>
                    <Pill tone="success">Factoring</Pill>
                    <Pill tone="warning">Einbehalt 15 %</Pill>
                  </>
                );
              return <Pill tone="muted">voll sofort</Pill>;
            })()}
            {deal.tippgeber && <Pill tone="muted">Tipp: {deal.tippgeber}</Pill>}
          </div>
        </>
      )}

      <div className="flex items-center gap-1 pt-0.5 text-xs text-muted-foreground">
        <User className="h-3 w-3 shrink-0" />
        <span className="truncate">{beraterName}</span>
      </div>
    </div>
  );
}
