// =====================================================================
// Monatsziele & Streaks (Schleife 3, Berater-Punkt 2)
// Datenbasis: berater_monatsziele (RLS: eigenes Ziel oder GF) + eigene
// Deals/Aktivitäten. Alle Beträge = EIGENE Provision des Beraters —
// der Hausanteil bleibt unsichtbar (Schleife 2, 2.2).
// =====================================================================
import { createClient } from "@/lib/supabase/server";
import { dealBeraterProvision, type DealFinanz } from "@/lib/provision";

export type SpartenZiel = {
  bereich: "immobilien" | "vv";
  /** Monatsziel (eigene Provision) — null = noch kein Ziel vereinbart. */
  ziel: number | null;
  /** Eigene Provision aus gewonnenen Deals im laufenden Kalendermonat. */
  erreicht: number;
  /** Monate in Folge Ziel erreicht (inkl. laufendem Monat, sobald erreicht). */
  streakMonate: number;
};

export type ZielDaten = {
  sparten: SpartenZiel[];
  /** Kalendertage bis Monatsende, inkl. heute. */
  restTage: number;
  /** Anteil des Monats, der bereits vergangen ist (0..1) — für die Pace. */
  monatsAnteil: number;
  /** Werktage in Folge mit mindestens einer Aktivität (Wochenende neutral). */
  aktivTage: number;
  monatsName: string;
  /** 15.2: Ziel von der GF gesperrt -> Berater kann es nicht selbst ändern. */
  gesperrt: boolean;
};

const MONAT = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

type WonDeal = DealFinanz & {
  bereich: "immobilien" | "vv";
  closed_at: string;
};

/** Summe der eigenen Provision gewonnener Deals eines Kalendermonats. */
function provisionImMonat(
  deals: WonDeal[],
  bereich: "immobilien" | "vv",
  jahr: number,
  monat: number,
  stufe: number,
): number {
  let sum = 0;
  for (const d of deals) {
    if (d.bereich !== bereich) continue;
    const c = new Date(d.closed_at);
    if (c.getFullYear() !== jahr || c.getMonth() !== monat) continue;
    sum += dealBeraterProvision(d, stufe);
  }
  return sum;
}

/**
 * Monats-Streak: von heute rückwärts, Ziel erreicht in Folge — gezählt ab
 * Firmeneintritt (profiles.created_at, Wunsch Lukas). Der laufende Monat
 * zählt mit, sobald er erreicht ist; sonst startet die Zählung im Vormonat.
 * Vergangene Monate werden gegen das AKTUELLE Ziel geprüft (keine
 * Ziel-Historie in der DB — bewusst einfach gehalten).
 */
function monatsStreak(
  deals: WonDeal[],
  bereich: "immobilien" | "vv",
  ziel: number,
  stufe: number,
  eintritt: Date,
  now: Date,
): number {
  if (ziel <= 0) return 0;
  const eintrittKey = eintritt.getFullYear() * 12 + eintritt.getMonth();
  let jahr = now.getFullYear();
  let monat = now.getMonth();
  let streak = 0;
  // Laufender Monat: zählt nur, wenn schon erreicht — bricht sonst nicht.
  if (provisionImMonat(deals, bereich, jahr, monat, stufe) >= ziel) streak += 1;
  for (let i = 0; i < 120; i++) {
    monat -= 1;
    if (monat < 0) {
      monat = 11;
      jahr -= 1;
    }
    if (jahr * 12 + monat < eintrittKey) break;
    if (provisionImMonat(deals, bereich, jahr, monat, stufe) >= ziel) streak += 1;
    else break;
  }
  return streak;
}

/** Lokaler Datums-Key (YYYY-MM-DD) ohne UTC-Verschiebung. */
function tagKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Aktivitäts-Streak in WERKTAGEN: aufeinanderfolgende Mo–Fr mit mindestens
 * einer Aktion (Timeline-Eintrag, Aufgabe, neuer Kontakt/Deal, Phasenwechsel).
 * Wochenenden sind neutral — sie brechen den Streak nicht, Aktivität dort
 * zählt aber als aktiver Tag. Der heutige Tag bricht den Streak nie
 * (er läuft ja noch).
 */
function aktivStreak(aktiveTage: Set<string>, now: Date): number {
  let streak = 0;
  const cursor = new Date(now);
  // Heute zählt, wenn aktiv — bricht aber nicht, wenn (noch) nicht.
  const heuteAktiv = aktiveTage.has(tagKey(cursor));
  if (heuteAktiv) streak += 1;
  cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 366; i++) {
    const wtag = cursor.getDay(); // 0 = So, 6 = Sa
    const aktiv = aktiveTage.has(tagKey(cursor));
    if (wtag === 0 || wtag === 6) {
      if (aktiv) streak += 1; // Wochenend-Einsatz zählt, fehlt aber nie
    } else {
      if (!aktiv) break;
      streak += 1;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Lädt alle Daten der Ziel-Box für den ANGEMELDETEN Berater. RLS liefert
 * automatisch nur eigene Deals/Aktivitäten/Ziele. Für die GF nicht gedacht
 * (Aufrufer blendet die Box rollenbasiert aus).
 */
export async function loadZielDaten(): Promise<ZielDaten | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profilQ, zielQ, dealsQ, stagesQ, aktQ, tasksQ, histQ] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("bereich, vertriebler_stufe, created_at")
        .eq("id", user.id)
        .single(),
      supabase
        .from("berater_monatsziele")
        .select("monatsziel_immobilien, monatsziel_vv, gesperrt")
        .eq("berater_id", user.id)
        .maybeSingle(),
      supabase
        .from("deals")
        .select(
          "bereich, stage_id, kaufpreis, bws, factoring, provisionssatz, berater_anteil, tippgeber_satz, closed_at, created_at",
        )
        .eq("berater_id", user.id),
      supabase.from("pipeline_stages").select("id, is_won"),
      supabase
        .from("contact_activities")
        .select("created_at")
        .eq("created_by", user.id),
      supabase.from("tasks").select("created_at").eq("owner_id", user.id),
      supabase.from("deal_stage_history").select("entered_at"),
    ]);

  const profil = profilQ.data;
  if (!profil) return null;

  const now = new Date();
  const stufe = Number(profil.vertriebler_stufe ?? 0);
  const eintritt = new Date(profil.created_at);
  const wonIds = new Set(
    (stagesQ.data ?? []).filter((s) => s.is_won).map((s) => s.id),
  );
  const wonDeals: WonDeal[] = ((dealsQ.data ?? []) as (WonDeal & {
    stage_id: string;
    closed_at: string | null;
  })[])
    .filter((d) => wonIds.has(d.stage_id) && d.closed_at)
    .map((d) => ({ ...d, closed_at: d.closed_at as string }));

  const bereiche = (profil.bereich?.length
    ? profil.bereich
    : ["immobilien", "vv"]) as ("immobilien" | "vv")[];
  const zielVon = (b: "immobilien" | "vv"): number | null => {
    const raw =
      b === "immobilien"
        ? zielQ.data?.monatsziel_immobilien
        : zielQ.data?.monatsziel_vv;
    return raw != null ? Number(raw) : null;
  };

  const sparten: SpartenZiel[] = bereiche.map((b) => {
    const ziel = zielVon(b);
    return {
      bereich: b,
      ziel,
      erreicht: provisionImMonat(
        wonDeals,
        b,
        now.getFullYear(),
        now.getMonth(),
        stufe,
      ),
      streakMonate: ziel
        ? monatsStreak(wonDeals, b, ziel, stufe, eintritt, now)
        : 0,
    };
  });

  // Aktive Tage aus allen Aktionsquellen einsammeln
  const aktiveTage = new Set<string>();
  const sammel = (iso: string | null | undefined) => {
    if (iso) aktiveTage.add(tagKey(new Date(iso)));
  };
  for (const a of aktQ.data ?? []) sammel(a.created_at);
  for (const t of tasksQ.data ?? []) sammel(t.created_at);
  for (const h of histQ.data ?? []) sammel(h.entered_at);
  for (const d of dealsQ.data ?? []) sammel(d.created_at);

  const tageImMonat = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
  ).getDate();

  return {
    sparten,
    restTage: tageImMonat - now.getDate() + 1,
    monatsAnteil: now.getDate() / tageImMonat,
    aktivTage: aktivStreak(aktiveTage, now),
    monatsName: MONAT[now.getMonth()],
    gesperrt: zielQ.data?.gesperrt ?? false,
  };
}
