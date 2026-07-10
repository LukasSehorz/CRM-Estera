// =====================================================================
// Deal Health Score (Schleife 2, Kap. 4.5) — Ampel als Steuerungssignal.
// Regeln laut Kundendokument, Schwellen als anpassbare Konstanten:
//   🔴 Frist überschritten ODER lange keine Aktivität
//   🟡 Frist nähert sich ODER Dokument fehlt (nur Immo) ODER keine offene Aufgabe
//   🟢 sonst (in der Frist, kürzlich Aktivität)
// „Dokument fehlt" blockiert nichts (4.7) — es färbt nur die Ampel.
// =====================================================================

/** Ab diesem Anteil der SLA-Frist wird die Ampel gelb („Frist nähert sich"). */
export const SLA_WARN_ANTEIL = 0.75;
/** Keine Aktivität seit ≥ X Tagen → gelb bzw. rot. */
export const AKTIVITAET_GELB_TAGE = 7;
export const AKTIVITAET_ROT_TAGE = 14;

export type Health = "gruen" | "gelb" | "rot";

export type HealthInput = {
  /** Tage in der aktuellen Phase (aus deal_stage_history). */
  tageInPhase: number | null;
  /** SLA der aktuellen Phase in Tagen (null = keine Frist, z. B. Abschluss). */
  slaTage: number | null;
  /** Tage seit der letzten Aktivität am Kontakt/Deal. */
  letzteAktivitaetTage: number | null;
  /** Nur Immobilien: fehlen anwendbare Dokumente? */
  dokumenteFehlen: boolean;
  /** Gibt es eine offene Aufgabe zu Deal oder Kontakt? */
  offeneAufgabe: boolean;
};

export type HealthResult = { health: Health; gruende: string[] };

export function computeDealHealth(i: HealthInput): HealthResult {
  const gruende: string[] = [];

  // Rot
  if (i.slaTage != null && i.tageInPhase != null && i.tageInPhase > i.slaTage) {
    gruende.push(
      `Frist überschritten (${Math.floor(i.tageInPhase)} von max. ${i.slaTage} Tagen in der Phase)`,
    );
  }
  if (
    i.letzteAktivitaetTage != null &&
    i.letzteAktivitaetTage >= AKTIVITAET_ROT_TAGE
  ) {
    gruende.push(
      `Keine Aktivität seit ${Math.floor(i.letzteAktivitaetTage)} Tagen`,
    );
  }
  if (gruende.length) return { health: "rot", gruende };

  // Gelb
  if (
    i.slaTage != null &&
    i.tageInPhase != null &&
    i.tageInPhase >= i.slaTage * SLA_WARN_ANTEIL
  ) {
    gruende.push(
      `Frist nähert sich (${Math.floor(i.tageInPhase)} von max. ${i.slaTage} Tagen)`,
    );
  }
  if (
    i.letzteAktivitaetTage != null &&
    i.letzteAktivitaetTage >= AKTIVITAET_GELB_TAGE
  ) {
    gruende.push(
      `Länger keine Aktivität (${Math.floor(i.letzteAktivitaetTage)} Tage)`,
    );
  }
  if (i.dokumenteFehlen) gruende.push("Dokumente unvollständig");
  if (!i.offeneAufgabe) gruende.push("Keine nächste Aufgabe gesetzt");
  if (gruende.length) return { health: "gelb", gruende };

  return { health: "gruen", gruende: ["In der Frist, zuletzt aktiv"] };
}

export function tageSeit(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, (now.getTime() - t) / 86_400_000);
}
