/**
 * Gemeinsamer Zeitraum-Filter (Feedback Mandant 07.09.2026): Sowohl die
 * Kundenliste („Kunde seit") als auch die Abschluss-Phasen im Deal-Board
 * werden sonst mit den Jahren unübersichtlich. Bewusst EINE Logik für beide,
 * damit die Auswahl überall gleich heißt und gleich rechnet.
 *
 * Alle Grenzen werden in Europe/Berlin gedacht und als reines Datum
 * (JJJJ-MM-TT) verglichen — das macht den Vergleich unabhängig davon, ob der
 * Wert ein `date` (Kontakt) oder ein `timestamptz` (Deal) ist.
 */

export type ZeitraumWert =
  | "alle"
  | "monat"
  | "letzter_monat"
  | "quartal"
  | "jahr"
  | "letztes_jahr"
  | "custom";

export const ZEITRAEUME: { value: ZeitraumWert; label: string }[] = [
  { value: "alle", label: "Gesamter Zeitraum" },
  { value: "monat", label: "Dieser Monat" },
  { value: "letzter_monat", label: "Letzter Monat" },
  { value: "quartal", label: "Dieses Quartal" },
  { value: "jahr", label: "Dieses Jahr" },
  { value: "letztes_jahr", label: "Letztes Jahr" },
  { value: "custom", label: "Eigener Zeitraum" },
];

export function zeitraumLabel(value: ZeitraumWert): string {
  return ZEITRAEUME.find((z) => z.value === value)?.label ?? value;
}

const TZ = "Europe/Berlin";
const isoFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Beliebigen Datumswert auf "JJJJ-MM-TT" in Europe/Berlin normalisieren. */
export function alsTag(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  // Reine Datumsspalten ("2024-03-01") nie durch die Zeitzone drehen.
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
    return value;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return isoFmt.format(d);
}

const pad = (n: number) => String(n).padStart(2, "0");
const tag = (j: number, m: number, t: number) => `${j}-${pad(m)}-${pad(t)}`;

export type ZeitraumGrenzen = { von: string | null; bis: string | null };

/**
 * Grenzen (inklusive) eines Zeitraums. `heute` ist injizierbar, damit die
 * Berechnung ohne Systemzeit prüfbar ist (Monats-, Quartals- und
 * Jahresgrenzen, Schaltjahr, Jahreswechsel).
 */
export function zeitraumGrenzen(
  wert: ZeitraumWert,
  custom?: { von?: string; bis?: string },
  heute: Date = new Date(),
): ZeitraumGrenzen {
  const heuteTag = alsTag(heute)!;
  const [jStr, mStr] = heuteTag.split("-");
  const jahr = Number(jStr);
  const monat = Number(mStr);

  switch (wert) {
    case "monat":
      return { von: tag(jahr, monat, 1), bis: letzterTag(jahr, monat) };
    case "letzter_monat": {
      const j = monat === 1 ? jahr - 1 : jahr;
      const m = monat === 1 ? 12 : monat - 1;
      return { von: tag(j, m, 1), bis: letzterTag(j, m) };
    }
    case "quartal": {
      const start = Math.floor((monat - 1) / 3) * 3 + 1;
      return { von: tag(jahr, start, 1), bis: letzterTag(jahr, start + 2) };
    }
    case "jahr":
      return { von: tag(jahr, 1, 1), bis: tag(jahr, 12, 31) };
    case "letztes_jahr":
      return { von: tag(jahr - 1, 1, 1), bis: tag(jahr - 1, 12, 31) };
    case "custom":
      return { von: custom?.von || null, bis: custom?.bis || null };
    default:
      return { von: null, bis: null };
  }
}

function letzterTag(jahr: number, monat: number): string {
  // Tag 0 des Folgemonats = letzter Tag des Monats (UTC, rein rechnerisch).
  const d = new Date(Date.UTC(jahr, monat, 0));
  return tag(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

/**
 * Liegt `value` im Zeitraum? Ein fehlendes Datum gilt hier als Treffer — die
 * Entscheidung, ob datumslose Einträge sichtbar bleiben, gehört fachlich an
 * die Aufrufstelle. Beide Aufrufer regeln den Fall vorher selbst: das Board
 * prüft nur Karten MIT Abschlussdatum, die Kundenliste filtert datumslose
 * Kunden bewusst raus und weist sie im Hinweis aus.
 */
export function imZeitraum(
  value: string | Date | null | undefined,
  grenzen: ZeitraumGrenzen,
): boolean {
  if (!grenzen.von && !grenzen.bis) return true;
  const t = alsTag(value);
  if (!t) return true;
  if (grenzen.von && t < grenzen.von) return false;
  if (grenzen.bis && t > grenzen.bis) return false;
  return true;
}
