// Einheitliche Formatierung (de-DE): Beträge & Datum.
const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/** "1.234.567 €" — null/undefined -> "—". */
export function formatEUR(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return eur.format(value);
}

// Beträge mit 2 Nachkommastellen (z. B. Provisions-Aufschlüsselung).
const eurCents = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "3.369,60 €" — null/undefined -> "—". */
export function formatEURCents(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  return eurCents.format(value);
}

/** Kompakt für Achsen/KPIs: 1.250.000 -> "1,3 Mio", 128.540 -> "129k", 640 -> "640". */
export function formatKompakt(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1_000_000)
    return `${(value / 1_000_000).toFixed(1).replace(".", ",")} Mio`;
  if (abs >= 1_000) return `${Math.round(value / 1_000)}k`;
  return `${Math.round(value)}`;
}

/** Prozent, de-DE: 0.405 -> "40,5 %". */
export function formatProzent(
  value: number | null | undefined,
  digits = 1,
): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits).replace(".", ",")} %`;
}

// Feste Zeitzone: macht die Ausgabe server- wie clientseitig deterministisch
// (sonst Hydration-Mismatch) und ist fachlich korrekt (Estera = Deutschland).
const TZ = "Europe/Berlin";

/** "TT.MM.JJJJ" — null/undefined -> "—". */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ,
  });
}

/** "TT.MM.JJJJ, HH:MM" — für Zeitstempel (z. B. Phasen-Verlauf). */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}
