import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { alsTag } from "@/lib/zeitraum";
import type { KundenSegment } from "@/config/enums";

export type SegmentDaten = {
  /** Segment je Kunde (4.2): berechnet aus den Deals, Altbestand als Override. */
  segmentMap: Record<string, KundenSegment>;
  /** „Kunde seit" je Bestandskunde als JJJJ-MM-TT. */
  bestandSeitMap: Record<string, string | null>;
};

/**
 * Segment + „Kunde seit" für eine Kontaktliste ermitteln — bewusst an EINER
 * Stelle, damit Kundenliste und Listen-Ansichten nie auseinanderlaufen
 * (Feedback Mandant 07.09.2026).
 *
 * „Kunde seit" = frühester Abschluss eines gewonnenen Deals; ein manuell
 * erfasstes Altbestands-Datum hat Vorrang, weil es der echte historische
 * Abschluss ist. Fällt closed_at aus (Altdaten vor Migration 0038), greift
 * das Anlagedatum des Deals als Näherung.
 */
export async function ladeSegmentDaten(
  supabase: SupabaseClient<Database>,
  contacts: {
    id: string;
    ist_bestandskunde?: boolean | null;
    bestandskunde_seit?: string | null;
  }[],
): Promise<SegmentDaten> {
  const ids = contacts.map((c) => c.id);
  if (ids.length === 0) return { segmentMap: {}, bestandSeitMap: {} };

  // Auf die geladenen Kontakte eingrenzen (sonst greift das 1000-Zeilen-Limit
  // von PostgREST), aber blockweise: die IDs stehen in der URL, und ab ein
  // paar hundert UUIDs reißt der Header-Puffer. Ein Fehler darf hier nicht
  // still durchgehen — sonst zeigt die Liste kommentarlos „Interessent".
  const BLOCK = 200;
  type DealZeile = {
    contact_id: string;
    closed_at: string | null;
    created_at: string;
    pipeline_stages: unknown;
  };
  const deals: DealZeile[] = [];
  for (let i = 0; i < ids.length; i += BLOCK) {
    const { data, error } = await supabase
      .from("deals")
      .select(
        "contact_id, closed_at, created_at, pipeline_stages!inner(is_won, is_lost)",
      )
      .in("contact_id", ids.slice(i, i + BLOCK));
    if (error) throw new Error(`Segment-Daten konnten nicht geladen werden.`);
    deals.push(...((data ?? []) as DealZeile[]));
  }

  const segmentMap: Record<string, KundenSegment> = {};
  const bestandSeitMap: Record<string, string | null> = {};

  for (const d of deals) {
    const st = (
      Array.isArray(d.pipeline_stages) ? d.pipeline_stages[0] : d.pipeline_stages
    ) as { is_won: boolean; is_lost: boolean } | null;
    const cur = segmentMap[d.contact_id];
    if (st?.is_won) segmentMap[d.contact_id] = "bestand";
    else if (!st?.is_lost && cur !== "bestand")
      segmentMap[d.contact_id] = "pipeline";
    else if (!cur) segmentMap[d.contact_id] = "interessent";

    const tag = st?.is_won
      ? (alsTag(d.closed_at) ?? alsTag(d.created_at))
      : null;
    if (tag) {
      const bisher = bestandSeitMap[d.contact_id];
      if (!bisher || tag < bisher) bestandSeitMap[d.contact_id] = tag;
    }
  }

  // Altbestand-Override (0021/0037): manuell markierte Bestandskunden zählen
  // auch ohne gewonnenen Deal im CRM, das erfasste Datum schlägt das
  // abgeleitete.
  for (const c of contacts) {
    if (c.ist_bestandskunde) segmentMap[c.id] = "bestand";
    if (c.bestandskunde_seit) bestandSeitMap[c.id] = c.bestandskunde_seit;
  }

  return { segmentMap, bestandSeitMap };
}
