// =====================================================================
// VV-Karriereleiter (V4.1 Kap. 7.3) — REINE FORTSCHRITTS-/MOTIVATIONSANZEIGE.
// Der Stufenwechsel bleibt eine manuelle GF-Entscheidung (kein Auto-Aufstieg).
// Der BWS-Zähler läuft im Fenster (kein Lebenskonto), Level sinkt nie,
// Fenster verpasst -> Zähler auf 0, neues Fenster. GF-70 % steht außerhalb.
// Gilt ausschließlich für die VV (basiert auf der BWS) — Immobilien nicht.
// =====================================================================

export type KarriereRang = {
  stufe: number;
  rang: string;
  anteil: number; // Prozent (Vertriebler-Stufe)
  schwelleBws: number; // benötigte BWS im Fenster, um diesen Rang zu erreichen
  fensterMonate: number | null; // Zeitfenster; null = Einstieg
};

export const KARRIERE_RAENGE: KarriereRang[] = [
  { stufe: 1, rang: "Associate I", anteil: 10, schwelleBws: 0, fensterMonate: null },
  { stufe: 2, rang: "Associate II", anteil: 15, schwelleBws: 250_000, fensterMonate: 3 },
  { stufe: 3, rang: "Consultant", anteil: 25, schwelleBws: 750_000, fensterMonate: 3 },
  { stufe: 4, rang: "Junior Partner", anteil: 40, schwelleBws: 1_000_000, fensterMonate: 6 },
  { stufe: 5, rang: "Partner", anteil: 55, schwelleBws: 2_000_000, fensterMonate: 6 },
];

/** Aktuellen Rang aus der (frei setzbaren) Vertriebler-Stufe ableiten:
 *  höchster Rang, dessen Anteil ≤ Stufe. GF-70 % landet auf „Partner". */
export function rangFuerStufe(stufe: number): KarriereRang {
  let cur = KARRIERE_RAENGE[0];
  for (const r of KARRIERE_RAENGE) if (stufe >= r.anteil) cur = r;
  return cur;
}

export function naechsterRang(stufe: number): KarriereRang | null {
  const cur = rangFuerStufe(stufe);
  return KARRIERE_RAENGE.find((r) => r.stufe === cur.stufe + 1) ?? null;
}

export type KarriereFortschritt = {
  aktuell: KarriereRang;
  naechster: KarriereRang | null;
  bwsImFenster: number;
  restBws: number; // bis zum nächsten Rang
  fortschrittPct: number; // 0..100
  fensterEndeISO: string | null;
  restTage: number | null;
  fensterAbgelaufen: boolean;
};

/**
 * Fortschritt zum nächsten Rang. `bwsImFenster` = Summe der BWS der im
 * aktuellen Fenster policierten VV-Deals (vom Aufrufer geliefert, damit RLS/
 * Realisierungslogik zentral bleibt). Ohne nächsten Rang (Partner) = Maximum.
 */
export function karriereFortschritt(
  stufe: number,
  fensterStartISO: string,
  bwsImFenster: number,
  now: Date,
): KarriereFortschritt {
  const aktuell = rangFuerStufe(stufe);
  const naechster = naechsterRang(stufe);
  const start = new Date(fensterStartISO);

  let fensterEndeISO: string | null = null;
  let restTage: number | null = null;
  let fensterAbgelaufen = false;
  if (naechster?.fensterMonate) {
    const ende = new Date(start);
    ende.setMonth(ende.getMonth() + naechster.fensterMonate);
    fensterEndeISO = ende.toISOString();
    const ms = ende.getTime() - now.getTime();
    restTage = Math.max(0, Math.ceil(ms / 86_400_000));
    fensterAbgelaufen = ms <= 0;
  }

  // Fenster verpasst -> Zähler auf 0 (Anzeige-Regel 7.3).
  const zaehler = fensterAbgelaufen ? 0 : bwsImFenster;
  const ziel = naechster?.schwelleBws ?? 0;
  const restBws = naechster ? Math.max(0, ziel - zaehler) : 0;
  const fortschrittPct = naechster
    ? Math.min(100, ziel > 0 ? (zaehler / ziel) * 100 : 0)
    : 100;

  return {
    aktuell,
    naechster,
    bwsImFenster: zaehler,
    restBws,
    fortschrittPct,
    fensterEndeISO,
    restTage,
    fensterAbgelaufen,
  };
}
