// =====================================================================
// Analytics für die Dashboards (Phase 6, überarbeitet in Schleife 2 Kap. 1).
// Basiert auf deals, pipeline_stages, deal_stage_history (RLS-gefiltert).
// Definitionen:
//   Erster Termin: Immobilien = "T1 Konzept", VV = "Termin vereinbart"
//   Deal-Time:     erster Termin (entered_at) bis closed_at (gewonnen)
//   Closing Rate:  gewonnene Deals ÷ Deals, die je den ersten Termin erreichten
//   Konversion n→n+1: erreichten n+1 ÷ erreichten n (über die Historie)
//   VOLUMEN (1.1):  Transaktionsvolumen = Kaufpreis (Immo) bzw. BWS (VV)
//   UMSATZ  (1.1):  Provision — GF sieht Estera-Umsatz, Berater sieht die
//                   EIGENE Provision (nie den Hausanteil, Kap. 2.2).
//   Storno (1.3):   verlorene Deals zählen in KEINEM "gewonnen"-Zähler.
// =====================================================================
import { createClient } from "@/lib/supabase/server";
import {
  dealVolumen,
  dealEsteraUmsatz,
  dealBeraterProvision,
  dealBeraterGewinn,
  dealTippgeberAnteil,
  zahlartOf,
  EINBEHALT_REST,
  FACTORING_ANTEIL,
  PROVISIONSSATZ,
  type ImmoProvisionModus,
} from "@/lib/provision";
import { IMMO_MODUS_KEY, parseImmoModus } from "@/lib/einstellungen";
import { istQualifiziert } from "@/config/enums";

export type Stage = {
  id: string;
  bereich: "immobilien" | "vv";
  name: string;
  position: number;
  is_won: boolean;
  is_lost: boolean;
  wahrscheinlichkeit: number;
};
export type Deal = {
  id: string;
  dealname: string;
  bereich: "immobilien" | "vv";
  stage_id: string;
  contact_id: string;
  kaufpreis: number | null;
  bws: number | null;
  factoring: boolean | null;
  vv_zahlart: string | null;
  ratierlich: boolean | null;
  provisionssatz: number | null;
  berater_anteil: number | null;
  tippgeber: string | null;
  tippgeber_satz: number | null;
  berater_id: string;
  closed_at: string | null;
  created_at: string;
};
export type Hist = { deal_id: string; stage_id: string; entered_at: string };
export type Contact = {
  id: string;
  leadquelle: string | null;
  berater_id: string;
  interesse: string[];
  // Finanzierungseinschätzung NEU (15.2): 3 Stati + „finanzierbar bis" + belegt
  einschaetzung: string;
  eingeschaetzter_betrag: number | null;
  belegt_deal_id: string | null;
  nettoverdienst_monatlich: number | null;
  eigenkapital: number | null;
  termin_status: string;
  vorname: string;
  nachname: string;
};

export type AnalyticsData = {
  deals: Deal[];
  stages: Stage[];
  history: Hist[];
  contacts: Contact[];
  sMap: Map<string, Stage>;
  beraterMap: Map<string, string>;
  beraterIds: string[];
  isGf: boolean;
  /** Sparten des angemeldeten Nutzers (GF: immer beide). */
  meineBereiche: ("immobilien" | "vv")[];
  /** Vertriebler-Stufe eines Beraters (Prozent, z. B. 30). */
  stufeOf: (beraterId: string) => number;
  /** Globaler Immo-Provisions-Modus (GF-Einstellung, 1.5). */
  immoModus: ImmoProvisionModus;
  /** Immobilien-Anteil-Default eines Beraters (Prozent, Anbindung 1.5/8.4). */
  immoDefaultOf: (beraterId: string) => number;
  /** Sichtbare Sparten eines Beraters (profiles.bereich; leer ⇒ beide). */
  bereichOf: (beraterId: string) => ("immobilien" | "vv")[];
  /** Übergeordneter Partner (Upline) eines Beraters — null, wenn keiner. */
  parentOf: (beraterId: string) => string | null;
  /** Direkte Partner (Downline) eines Beraters (Kap. 8). */
  downlineOf: (beraterId: string) => string[];
  /** Start des aktuellen Karriere-Fensters (7.3). */
  fensterStartOf: (beraterId: string) => string;
  /** Anzeigename eines Beraters. */
  nameOf: (beraterId: string) => string;
  /** Umsatz eines Deals gemäß Rolle: GF = Estera-Umsatz, Berater = eigene Provision. */
  umsatzOf: (d: Deal) => number;
  /**
   * Einbehalt (15 %) — bei Factoring UND ohne Factoring (F1.4); nur
   * ratierlich hat keinen.
   * Basis ist der Auszahlungsanspruch des Beraters (Stufe − Tippgeber);
   * der Topf ist für GF und Berater derselbe Betrag (bei Estera geparkt).
   */
  einbehaltOf: (d: Deal) => number;
  /**
   * Umsatz-Buchung (1.1 GEKLÄRT): Immobilien realisieren zum NOTARTERMIN
   * (nicht erst bei „Kauf abgeschlossen"), VV bei Policierung (= gewonnen).
   * Stornierte/verlorene Deals sind nie realisiert.
   */
  istRealisiert: (d: Deal) => boolean;
  /** Buchungsdatum des realisierten Umsatzes (Immo: Eintritt Notartermin). */
  realisiertAm: (d: Deal) => string | null;
};

/** Auswahl im Bereichs-Umschalter der Dashboards. */
export type BereichScope = "immobilien" | "vv" | "gesamt";

/**
 * Schränkt die Sicht auf einen Bereich ein — alle Kennzahlen-Funktionen
 * rechnen danach automatisch nur auf diesen Deals (Lukas A: getrennte
 * Dashboards inkl. Closing Rate, Deal-Time, Konversion je Sparte).
 */
export function scopeToBereich(a: AnalyticsData, scope: BereichScope): AnalyticsData {
  if (scope === "gesamt") return a;
  return { ...a, deals: a.deals.filter((d) => d.bereich === scope) };
}

/** Erlaubte Umschalter-Optionen des Nutzers (+ "gesamt" nur bei beiden Sparten). */
export function erlaubteScopes(a: AnalyticsData): BereichScope[] {
  return a.meineBereiche.length > 1
    ? ["gesamt", ...a.meineBereiche]
    : [...a.meineBereiche];
}

/** Normalisiert den ?bereich=-Parameter gegen die erlaubten Optionen. */
export function resolveScope(
  a: AnalyticsData,
  raw: string | undefined,
): BereichScope {
  const erlaubt = erlaubteScopes(a);
  return erlaubt.includes(raw as BereichScope)
    ? (raw as BereichScope)
    : erlaubt[0];
}

/** Sicht auf einen einzelnen Berater (GF-Drilldown, Wunsch B). */
export function scopeToBerater(a: AnalyticsData, beraterId: string): AnalyticsData {
  return {
    ...a,
    deals: a.deals.filter((d) => d.berater_id === beraterId),
    contacts: a.contacts.filter((c) => c.berater_id === beraterId),
  };
}

/** Stornoquote = verlorene ÷ entschiedene Deals (gewonnen + verloren). */
export function stornoQuote(a: AnalyticsData, beraterId?: string): number | null {
  let won = 0;
  let lost = 0;
  for (const d of a.deals) {
    if (beraterId && d.berater_id !== beraterId) continue;
    if (isWon(d, a.sMap)) won += 1;
    else if (isLost(d, a.sMap)) lost += 1;
  }
  const entschieden = won + lost;
  return entschieden ? lost / entschieden : null;
}

/**
 * Forecast (Kap. 6): gewichtete PROVISION der offenen Pipeline über
 * 7/30/60/90 Tage. Ohne geplantes Abschlussdatum je Deal nähern wir über die
 * Phasen-Wahrscheinlichkeit an: sehr späte Phasen (≥ 90 %) schließen typisch
 * binnen ~7 Tagen (5.6, Wochenforecast), späte (≥ 80 %) in ~30 Tagen,
 * mittlere (≥ 40 %) in ~60, der Rest in ~90 (kumulativ).
 */
export function forecastGewichtet(a: AnalyticsData) {
  let t7 = 0;
  let t30 = 0;
  let t60 = 0;
  let t90 = 0;
  for (const d of a.deals) {
    if (!isOpen(d, a.sMap)) continue;
    const prob = (a.sMap.get(d.stage_id)?.wahrscheinlichkeit ?? 0) / 100;
    const gewichtet = a.umsatzOf(d) * prob;
    t90 += gewichtet;
    if (prob >= 0.4) t60 += gewichtet;
    if (prob >= 0.8) t30 += gewichtet;
    if (prob >= 0.9) t7 += gewichtet;
  }
  return { t7, t30, t60, t90 };
}

/**
 * Summen-Skala (6.2, NUR GF): realisierte Provision als Zerlegung von
 * „Summe X nach Factoring" in DISJUNKTE Teile (V4.1, 7.1 + Modell Lukas):
 *   brutto = esteraNetto + beraterProvision (Auszahlung) + einbehalt + tippgeber
 * Einbehalt (15 %) gilt für alle nicht-ratierlichen VV-Deals (F1.4) und ist der geparkte Teil des
 * Berater-Anspruchs; der Tippgeber wird aus dem Berater-Anteil bedient.
 * Realisiert = Immobilien ab Notartermin, VV bei Policierung (1.1).
 */
export type SummenSkala = {
  brutto: number;
  einbehalt: number;
  tippgeber: number;
  beraterProvision: number;
  esteraNetto: number;
};

export function summenSkala(
  a: AnalyticsData,
  bereich?: "immobilien" | "vv",
): SummenSkala {
  let brutto = 0;
  let einbehalt = 0;
  let tippgeber = 0;
  let beraterProvision = 0;
  for (const d of a.deals) {
    if (!a.istRealisiert(d)) continue;
    if (bereich && d.bereich !== bereich) continue;
    if (d.bereich === "immobilien") {
      const b = (d.kaufpreis ?? 0) * ((d.provisionssatz ?? 0) / 100);
      brutto += b;
      beraterProvision += dealBeraterProvision(
        d,
        a.stufeOf(d.berater_id),
        a.immoModus,
      );
    } else {
      const netto =
        (d.bws ?? 0) *
        PROVISIONSSATZ *
        (zahlartOf(d) === "factoring" ? FACTORING_ANTEIL : 1);
      brutto += netto;
      const tipp = dealTippgeberAnteil(d);
      const gewinn = dealBeraterGewinn(d, a.stufeOf(d.berater_id), a.immoModus);
      // F1.4: Einbehalt bei Factoring UND ohne Factoring (nur ratierlich nicht).
      const einb =
        zahlartOf(d) !== "ratierlich" ? gewinn * EINBEHALT_REST : 0;
      tippgeber += tipp;
      einbehalt += einb;
      beraterProvision += gewinn - einb; // Auszahlungsanteil (sofort/ratierlich)
    }
  }
  return {
    brutto,
    einbehalt,
    tippgeber,
    beraterProvision,
    esteraNetto: brutto - einbehalt - tippgeber - beraterProvision,
  };
}

const ERSTER_TERMIN: Record<string, string> = {
  immobilien: "T1 Konzept",
  vv: "Termin vereinbart",
};

export async function loadAnalytics(): Promise<AnalyticsData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [dealsQ, stagesQ, histQ, contactsQ, profilesQ, einstQ] = await Promise.all([
    supabase
      .from("deals")
      .select(
        "id, dealname, bereich, stage_id, contact_id, kaufpreis, bws, factoring, vv_zahlart, ratierlich, provisionssatz, berater_anteil, tippgeber, tippgeber_satz, berater_id, closed_at, created_at",
      ),
    supabase
      .from("pipeline_stages")
      .select("id, bereich, name, position, is_won, is_lost, wahrscheinlichkeit"),
    supabase.from("deal_stage_history").select("deal_id, stage_id, entered_at"),
    supabase
      .from("contacts")
      .select(
        "id, leadquelle, berater_id, interesse, einschaetzung, eingeschaetzter_betrag, belegt_deal_id, nettoverdienst_monatlich, eigenkapital, termin_status, vorname, nachname",
      ),
    supabase
      .from("profiles")
      .select(
        "id, vorname, nachname, aktiv, rolle, vertriebler_stufe, bereich, immo_anteil_default, parent_berater_id, karriere_fenster_start",
      ),
    supabase
      .from("crm_einstellungen")
      .select("value")
      .eq("key", IMMO_MODUS_KEY)
      .maybeSingle(),
  ]);

  const immoModus = parseImmoModus(einstQ.data?.value);
  const stages = (stagesQ.data ?? []) as Stage[];
  const sMap = new Map(stages.map((s) => [s.id, s]));
  const profiles = profilesQ.data ?? [];
  const beraterMap = new Map(
    profiles.map((p) => [p.id, `${p.vorname} ${p.nachname}`]),
  );
  const stufeMap = new Map(
    profiles.map((p) => [p.id, Number(p.vertriebler_stufe ?? 0)]),
  );
  const immoDefaultMap = new Map(
    profiles.map((p) => [p.id, Number(p.immo_anteil_default ?? 0)]),
  );
  // Sichtbare Sparten je Berater (Call SJ Fine-Tuning P3): reine Immobilien-
  // Berater bekommen in der Performance nirgends VV zu sehen. Leer ⇒ beide.
  const bereichMap = new Map(
    profiles.map((p) => [
      p.id,
      (p.bereich?.length ? p.bereich : ["immobilien", "vv"]) as (
        | "immobilien"
        | "vv"
      )[],
    ]),
  );
  const parentMap = new Map(
    profiles.map((p) => [p.id, p.parent_berater_id ?? null]),
  );
  const fensterMap = new Map(
    profiles.map((p) => [p.id, p.karriere_fenster_start ?? new Date(0).toISOString()]),
  );
  const downlineMap = new Map<string, string[]>();
  for (const p of profiles) {
    if (p.parent_berater_id) {
      const arr = downlineMap.get(p.parent_berater_id) ?? [];
      arr.push(p.id);
      downlineMap.set(p.parent_berater_id, arr);
    }
  }
  const me = profiles.find((p) => p.id === user?.id);
  const isGf = me?.rolle === "geschaeftsfuehrung";
  const meineBereiche: ("immobilien" | "vv")[] = isGf
    ? ["immobilien", "vv"]
    : me?.bereich?.length
      ? me.bereich
      : ["immobilien", "vv"];

  // Rollenbewusste Umsatzdefinition (1.1 + 2.2): der Berater bekommt an
  // KEINER Stelle den Estera-/Hausanteil zu sehen — sein "Umsatz" ist die
  // eigene Provision. Die GF rechnet auf den Estera-Umsatz.
  const umsatzOf = (d: Deal) =>
    isGf
      ? dealEsteraUmsatz(d, stufeMap.get(d.berater_id), immoModus)
      : dealBeraterProvision(d, stufeMap.get(d.berater_id), immoModus);

  // Einbehalt (F1.4, Call SJ): 15 % des Auszahlungsanspruchs (Stufe −
  // Tippgeber) bei Factoring UND ohne Factoring — nur ratierlich hat keinen
  // Einbehalt (analog provision.ts: einbehalt = !ratierlich).
  const einbehaltOf = (d: Deal) => {
    if (d.bereich !== "vv" || zahlartOf(d) === "ratierlich") return 0;
    return (
      dealBeraterGewinn(d, stufeMap.get(d.berater_id), immoModus) * EINBEHALT_REST
    );
  };

  const deals = (dealsQ.data ?? []) as Deal[];
  const history = (histQ.data ?? []) as Hist[];

  // Umsatz-Buchung (1.1 GEKLÄRT): Immobilien realisieren zum NOTARTERMIN.
  // Buchungsdatum = erster Eintritt in die Notartermin-Phase (Historie);
  // Rückstufung/Storno heilt sich selbst, weil der aktuelle Status zählt.
  const notarStage = stages.find(
    (s) => s.bereich === "immobilien" && s.name === "Notartermin",
  );
  const notarEntered = new Map<string, string>();
  if (notarStage) {
    for (const h of history) {
      if (h.stage_id !== notarStage.id) continue;
      const prev = notarEntered.get(h.deal_id);
      if (!prev || h.entered_at < prev) notarEntered.set(h.deal_id, h.entered_at);
    }
  }
  const istRealisiert = (d: Deal): boolean => {
    const s = sMap.get(d.stage_id);
    if (!s || s.is_lost) return false;
    if (d.bereich === "vv") return s.is_won; // Policierung
    if (s.is_won) return true;
    return notarStage != null && s.position >= notarStage.position;
  };
  const realisiertAm = (d: Deal): string | null => {
    if (!istRealisiert(d)) return null;
    if (d.bereich === "immobilien") {
      return notarEntered.get(d.id) ?? d.closed_at ?? d.created_at;
    }
    return d.closed_at ?? d.created_at;
  };

  return {
    deals,
    stages,
    history,
    contacts: (contactsQ.data ?? []) as Contact[],
    sMap,
    beraterMap,
    beraterIds: profiles.map((p) => p.id),
    isGf,
    meineBereiche,
    stufeOf: (id: string) => stufeMap.get(id) ?? 0,
    immoModus,
    immoDefaultOf: (id: string) => immoDefaultMap.get(id) ?? 0,
    bereichOf: (id: string) =>
      bereichMap.get(id) ?? ["immobilien", "vv"],
    parentOf: (id: string) => parentMap.get(id) ?? null,
    downlineOf: (id: string) => downlineMap.get(id) ?? [],
    fensterStartOf: (id: string) =>
      fensterMap.get(id) ?? new Date(0).toISOString(),
    nameOf: (id: string) => beraterMap.get(id) ?? "—",
    umsatzOf,
    einbehaltOf,
    istRealisiert,
    realisiertAm,
  };
}

// ── Grundhelfer ──────────────────────────────────────────────────────────
/** Transaktionsvolumen des Deals (1.1) — NICHT der Umsatz. */
export const betragOf = (d: Deal) => dealVolumen(d);
export const isWon = (d: Deal, sMap: Map<string, Stage>) =>
  sMap.get(d.stage_id)?.is_won ?? false;
export const isLost = (d: Deal, sMap: Map<string, Stage>) =>
  sMap.get(d.stage_id)?.is_lost ?? false;
export const isOpen = (d: Deal, sMap: Map<string, Stage>) =>
  !isWon(d, sMap) && !isLost(d, sMap);

/** Höchste je erreichte Phasen-Position (nur nicht-verlorene Phasen). */
function reachedMaxByDeal(a: AnalyticsData): Map<string, number> {
  const m = new Map<string, number>();
  for (const h of a.history) {
    const s = a.sMap.get(h.stage_id);
    if (!s || s.is_lost) continue;
    const cur = m.get(h.deal_id) ?? 0;
    if (s.position > cur) m.set(h.deal_id, s.position);
  }
  return m;
}

// ── Pipeline-Volumen ─────────────────────────────────────────────────────
export function pipelineVolumen(a: AnalyticsData) {
  let immobilien = 0;
  let vv = 0;
  for (const d of a.deals) {
    if (!isOpen(d, a.sMap)) continue;
    if (d.bereich === "immobilien") immobilien += d.kaufpreis ?? 0;
    else vv += d.bws ?? 0;
  }
  return { immobilien, vv, gesamt: immobilien + vv };
}

// ── Funnel je Bereich (erreichte Deals pro Phase, absteigend) ─────────────
export type FunnelStep = {
  name: string;
  position: number;
  reached: number;
  volumen: number;
  wahrscheinlichkeit: number;
  /** Deals, die diese Phase erreicht haben (Feedback SJ: Klick → Pop-up). */
  deals: { name: string; volumen: number }[];
};

export function funnelFor(bereich: "immobilien" | "vv", a: AnalyticsData): FunnelStep[] {
  const steps = a.stages
    .filter((s) => s.bereich === bereich && !s.is_lost)
    .sort((x, y) => x.position - y.position);
  const reachedMax = reachedMaxByDeal(a);
  const dealsB = a.deals.filter((d) => d.bereich === bereich);
  return steps.map((s) => {
    // Storno-Fix (1.3): die Gewonnen-Phase zählt NUR Deals, die aktuell
    // gewonnen sind. Ein stornierter Deal, der die Phase früher durchlaufen
    // hat, ist KEIN Abschluss (Bug "Kauf abgeschlossen: 1 bei Storniert").
    const reachedDeals = dealsB.filter((d) =>
      s.is_won ? isWon(d, a.sMap) : (reachedMax.get(d.id) ?? 0) >= s.position,
    );
    return {
      name: s.name,
      position: s.position,
      reached: reachedDeals.length,
      volumen: reachedDeals.reduce((sum, d) => sum + betragOf(d), 0),
      wahrscheinlichkeit: s.wahrscheinlichkeit,
      deals: reachedDeals
        .map((d) => ({ name: d.dealname, volumen: betragOf(d) }))
        .sort((x, y) => y.volumen - x.volumen),
    };
  });
}

export function conversionRates(funnel: FunnelStep[]) {
  const out: { from: string; to: string; rate: number }[] = [];
  for (let i = 0; i < funnel.length - 1; i++) {
    const a = funnel[i].reached;
    const b = funnel[i + 1].reached;
    out.push({ from: funnel[i].name, to: funnel[i + 1].name, rate: a ? b / a : 0 });
  }
  return out;
}

// ── Volumen pro Phase (aktuell offen darin) ──────────────────────────────
export function volumenProPhase(bereich: "immobilien" | "vv", a: AnalyticsData) {
  const steps = a.stages
    .filter((s) => s.bereich === bereich && !s.is_won && !s.is_lost)
    .sort((x, y) => x.position - y.position);
  return steps.map((s) => {
    const inStage = a.deals.filter((d) => d.stage_id === s.id);
    return {
      name: s.name,
      volumen: inStage.reduce((sum, d) => sum + betragOf(d), 0),
      count: inStage.length,
    };
  });
}

// ── Deal-Time & Closing Rate ─────────────────────────────────────────────
function ersterTerminStageIds(a: AnalyticsData) {
  const ids = new Map<string, string>(); // bereich -> stage_id
  for (const s of a.stages) {
    if (ERSTER_TERMIN[s.bereich] === s.name) ids.set(s.bereich, s.id);
  }
  return ids;
}

/** Ø Deal-Time in Tagen (erster Termin → closed_at) über gewonnene Deals. */
export function dealTimeTage(a: AnalyticsData, beraterId?: string): number | null {
  const et = ersterTerminStageIds(a);
  const entered = new Map<string, string>(); // deal_id -> entered_at des ersten Termins
  for (const h of a.history) {
    const s = a.sMap.get(h.stage_id);
    if (!s) continue;
    if (et.get(s.bereich) === h.stage_id) {
      const prev = entered.get(h.deal_id);
      if (!prev || h.entered_at < prev) entered.set(h.deal_id, h.entered_at);
    }
  }
  const spans: number[] = [];
  for (const d of a.deals) {
    if (beraterId && d.berater_id !== beraterId) continue;
    if (!isWon(d, a.sMap) || !d.closed_at) continue;
    const start = entered.get(d.id);
    if (!start) continue;
    const ms = new Date(d.closed_at).getTime() - new Date(start).getTime();
    if (ms >= 0) spans.push(ms / (1000 * 60 * 60 * 24));
  }
  if (!spans.length) return null;
  return spans.reduce((s, x) => s + x, 0) / spans.length;
}

/** Closing Rate = gewonnen ÷ (je ersten Termin erreicht). */
export function closingRate(a: AnalyticsData, beraterId?: string): number | null {
  const et = ersterTerminStageIds(a);
  const reachedFirst = new Set<string>();
  const posOfFirst = new Map<string, number>();
  for (const [bereich, sid] of et) {
    const s = a.sMap.get(sid);
    if (s) posOfFirst.set(bereich, s.position);
  }
  const reachedMax = reachedMaxByDeal(a);
  let won = 0;
  let base = 0;
  for (const d of a.deals) {
    if (beraterId && d.berater_id !== beraterId) continue;
    const fp = posOfFirst.get(d.bereich);
    if (fp != null && (reachedMax.get(d.id) ?? 0) >= fp) {
      base += 1;
      reachedFirst.add(d.id);
      if (isWon(d, a.sMap)) won += 1;
    }
  }
  if (!base) return null;
  return won / base;
}

// ── Umsatz (realisiert) — Provision, nicht Volumen (1.1) ─────────────────
// Realisiert = Immobilien ab Notartermin, VV bei Policierung (GEKLÄRT-Box).
export function umsatzGesamt(a: AnalyticsData, beraterId?: string) {
  return a.deals
    .filter(
      (d) =>
        a.istRealisiert(d) && (!beraterId || d.berater_id === beraterId),
    )
    .reduce((s, d) => s + a.umsatzOf(d), 0);
}

/** Abgeschlossenes Transaktionsvolumen (sekundäre Kennzahl neben dem Umsatz). */
export function volumenGewonnen(a: AnalyticsData, beraterId?: string) {
  return a.deals
    .filter(
      (d) =>
        isWon(d, a.sMap) && (!beraterId || d.berater_id === beraterId),
    )
    .reduce((s, d) => s + betragOf(d), 0);
}

/** Umsatz je Monat (letzte n Monate) — nach Buchungsdatum (realisiertAm). */
export function umsatzProMonat(a: AnalyticsData, monate: number, now: Date) {
  const buckets: { label: string; value: number; key: string }[] = [];
  const monat = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  for (let i = monate - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      label: monat[d.getMonth()],
      key: `${d.getFullYear()}-${d.getMonth()}`,
      value: 0,
    });
  }
  const map = new Map(buckets.map((b) => [b.key, b]));
  for (const d of a.deals) {
    const am = a.realisiertAm(d);
    if (!am) continue;
    const c = new Date(am);
    const b = map.get(`${c.getFullYear()}-${c.getMonth()}`);
    if (b) b.value += a.umsatzOf(d);
  }
  return buckets.map(({ label, value }) => ({ label, value }));
}

/**
 * Rollierender Umsatz (Wunsch Schleife 3, Punkt 5): Provision der gewonnenen
 * Deals in den letzten `tage` Tagen (nach closed_at) und in der gleich langen
 * Vorperiode davor. Löst den verzerrten „angebrochener Monat vs. voller
 * Vormonat"-Vergleich ab — es werden immer gleich lange Zeiträume verglichen.
 */
export function umsatzRollierend(a: AnalyticsData, now: Date, tage = 30) {
  const ms = tage * 24 * 60 * 60 * 1000;
  const grenzeAktuell = now.getTime() - ms;
  const grenzeVor = now.getTime() - 2 * ms;
  let current = 0;
  let previous = 0;
  for (const d of a.deals) {
    const am = a.realisiertAm(d);
    if (!am) continue;
    const t = new Date(am).getTime();
    if (t > now.getTime()) continue;
    if (t >= grenzeAktuell) current += a.umsatzOf(d);
    else if (t >= grenzeVor) previous += a.umsatzOf(d);
  }
  return { current, previous };
}

// ── Umsatz nach Leadquelle (realisierte Deals → Kontakt → Quelle) ────────
export function umsatzNachQuelle(a: AnalyticsData) {
  const cMap = new Map(a.contacts.map((c) => [c.id, c.leadquelle ?? "Sonstige"]));
  const acc = new Map<string, number>();
  for (const d of a.deals) {
    if (!a.istRealisiert(d)) continue;
    const q = cMap.get(d.contact_id) ?? "Sonstige";
    acc.set(q, (acc.get(q) ?? 0) + a.umsatzOf(d));
  }
  return [...acc.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((x, y) => y.value - x.value);
}

// ── Berater-Performance ──────────────────────────────────────────────────
export type BeraterPerf = {
  id: string;
  name: string;
  umsatz: number;
  offene: number;
  avgDealGroesse: number;
  dealTime: number | null;
  closing: number | null;
  storno: number | null;
};

export function beraterPerformance(a: AnalyticsData): BeraterPerf[] {
  const ids = [...new Set(a.deals.map((d) => d.berater_id))];
  // auch Berater ohne Deals aus beraterMap ergänzen
  for (const id of a.beraterIds) if (!ids.includes(id)) ids.push(id);
  return ids
    .map((id) => {
      const mine = a.deals.filter((d) => d.berater_id === id);
      const wonDeals = mine.filter((d) => isWon(d, a.sMap));
      // Umsatz nach Buchungslogik 1.1 (Immo ab Notartermin, VV Policierung)
      const umsatz = mine
        .filter((d) => a.istRealisiert(d))
        .reduce((s, d) => s + a.umsatzOf(d), 0);
      // Ø Deal-Größe bleibt bewusst das Transaktionsvolumen (1.1) —
      // "wie groß sind die Abschlüsse", nicht "was verdienen wir daran".
      const volumenWon = wonDeals.reduce((s, d) => s + betragOf(d), 0);
      const offene = mine.filter((d) => isOpen(d, a.sMap)).length;
      return {
        id,
        name: a.beraterMap.get(id) ?? "—",
        umsatz,
        offene,
        avgDealGroesse: wonDeals.length ? volumenWon / wonDeals.length : 0,
        dealTime: dealTimeTage(a, id),
        closing: closingRate(a, id),
        storno: stornoQuote(a, id),
      };
    })
    .filter((r) => r.umsatz > 0 || r.offene > 0)
    .sort((x, y) => y.umsatz - x.umsatz);
}

// ── Reserviert / Verbrieft je Berater (Call SJ Fine-Tuning P4) ────────────
export type ReserviertVerbrieftDeal = {
  dealId: string;
  dealname: string;
  kaufpreis: number;
  /** true, wenn der Deal die Notartermin-Phase erreicht hat (= verbrieft). */
  verbrieft: boolean;
};
export type ReserviertVerbrieft = {
  id: string;
  name: string;
  reserviert: number;
  verbrieft: number;
  /** Einzelne Deals hinter den Zahlen (alle reserviert; verbrieft = Teilmenge). */
  deals: ReserviertVerbrieftDeal[];
};

/**
 * Board „wer hat wie viel reserviert / verbrieft" (GF-Ansicht, nur Immobilien).
 * Gemeinsame (kumulative) Töpfe:
 *  • Reserviert = Deal hat mindestens die Phase „Objekt reserviert" erreicht.
 *  • Verbrieft = zum Notar gebracht (Phase „Notartermin" erreicht) — Teilmenge
 *    von Reserviert.
 * Storniert zählt nicht. Volumen = Kaufpreis. Ein verbriefter Deal zählt also
 * auch im Reserviert-Topf mit.
 */
export function reserviertVerbrieft(a: AnalyticsData): ReserviertVerbrieft[] {
  const reservStage = a.stages.find(
    (s) => s.bereich === "immobilien" && s.name === "Objekt reserviert",
  );
  const notarStage = a.stages.find(
    (s) => s.bereich === "immobilien" && s.name === "Notartermin",
  );
  const acc = new Map<
    string,
    { reserviert: number; verbrieft: number; deals: ReserviertVerbrieftDeal[] }
  >();
  for (const d of a.deals) {
    if (d.bereich !== "immobilien") continue;
    const s = a.sMap.get(d.stage_id);
    if (!s || s.is_lost) continue;
    const istReserviert =
      reservStage != null && s.position >= reservStage.position;
    if (!istReserviert) continue; // verbrieft ist Teilmenge → reicht als Filter
    const istVerbrieft = notarStage != null && s.position >= notarStage.position;
    const vol = d.kaufpreis ?? 0;
    const cur = acc.get(d.berater_id) ?? {
      reserviert: 0,
      verbrieft: 0,
      deals: [],
    };
    cur.reserviert += vol;
    if (istVerbrieft) cur.verbrieft += vol;
    cur.deals.push({
      dealId: d.id,
      dealname: d.dealname,
      kaufpreis: vol,
      verbrieft: istVerbrieft,
    });
    acc.set(d.berater_id, cur);
  }
  return [...acc.entries()]
    .map(([id, v]) => ({
      id,
      name: a.nameOf(id),
      reserviert: v.reserviert,
      verbrieft: v.verbrieft,
      deals: v.deals.sort((x, y) => y.kaufpreis - x.kaufpreis),
    }))
    .filter((r) => r.reserviert > 0)
    .sort((x, y) => y.verbrieft - x.verbrieft || y.reserviert - x.reserviert);
}

// ── Heiße Leads (15.2) ───────────────────────────────────────────────────
// „Verkaufsreif, aber noch nicht gestartet": qualifiziert (Netto + Eigen-
// kapital über der Schwelle) + Finanzierung eingeschätzt + Erstgespräch
// durchgeführt — und noch KEIN fortgeschrittener Deal. Genau die Kunden, bei
// denen Umsatz liegen bleibt.
//
// Bewusst NUR Immobilien (Entscheidung 16.07.): die Finanzierungseinschätzung
// gibt es fachlich nur dort. Damit ist die Sparten-Bindung explizit statt ein
// stiller Nebeneffekt des Einschätzungs-Filters.

/** Deal gilt als fortgeschritten (Kunde ist „schon gestartet"). */
export function istFortgeschrittenerDeal(
  d: Deal,
  sMap: Map<string, Stage>,
): boolean {
  const s = sMap.get(d.stage_id);
  if (!s) return false;
  return s.is_won || s.position >= 4;
}

/** Kunden-IDs mit heißem Lead (nur Immobilien) — eine Quelle für alle Views. */
export function heisseLeads(a: AnalyticsData): Contact[] {
  const gestartet = new Set(
    a.deals
      .filter((d) => istFortgeschrittenerDeal(d, a.sMap))
      .map((d) => d.contact_id),
  );
  return a.contacts.filter(
    (c) =>
      (c.interesse ?? []).includes("immobilien") &&
      istQualifiziert(c.nettoverdienst_monatlich, c.eigenkapital) &&
      c.einschaetzung === "eingeschaetzt" &&
      c.termin_status === "Durchgeführt" &&
      !gestartet.has(c.id),
  );
}
