// Zentrale Enum-/Optionsdefinitionen — exakt nach docs/anforderungen.md
// und dem DB-Schema (0001_schema.sql). `satisfies` hält sie mit den
// generierten DB-Typen synchron.
import type { Database } from "@/types/database";

type Enums = Database["public"]["Enums"];

export const KONTAKT_STATUS = [
  "Neu",
  "In Bearbeitung",
  "Qualifiziert",
  "Nicht erreicht",
  "Kalt",
] as const satisfies readonly Enums["kontakt_status_enum"][];

export const TERMIN_STATUS = [
  "Nicht vereinbart",
  "Vereinbart",
  "Durchgeführt",
] as const satisfies readonly Enums["termin_status_enum"][];

export const LEADQUELLE = [
  "TikTok",
  "Instagram",
  "Facebook",
  "Empfehlung",
  "Kooperationen",
  "Webseite",
  "Sonstige",
] as const satisfies readonly Enums["leadquelle_enum"][];

export const FINANZIERUNGSRAHMEN = [
  "Bis 250k",
  "250-350k",
  "350-500k",
  "500-700k",
  "700k+",
] as const satisfies readonly Enums["finanzierungsrahmen_enum"][];

// Alt-Enum (0001) — bleibt für DB-Typ-Kompatibilität, wird im UI nicht mehr
// verwendet (ersetzt durch die 3-Stufen-Einschätzung, 15.2).
export const EINSCHAETZUNG_STATUS = [
  "Ausstehend",
  "Positiv",
  "Bedingt positiv",
  "Abgelehnt",
] as const satisfies readonly Enums["einschaetzung_status_enum"][];

// ── Finanzierungseinschätzung NEU (V4.1, 15.2) ───────────────────────────
// Nur noch drei Stati; bei „eingeschätzt" zusätzlich „finanzierbar bis ca. €"
// und optional „auf Objekt belegt". Gilt ausschließlich für Immobilien.
export const EINSCHAETZUNG = [
  { value: "ausstehend", label: "Ausstehend", tone: "muted" as const },
  { value: "eingeschaetzt", label: "Eingeschätzt", tone: "success" as const },
  {
    value: "nicht_finanzierbar",
    label: "Nicht finanzierbar",
    tone: "danger" as const,
  },
] as const;

export type EinschaetzungValue = (typeof EINSCHAETZUNG)[number]["value"];

export function einschaetzungLabel(value: string): string {
  return EINSCHAETZUNG.find((e) => e.value === value)?.label ?? value;
}
export function einschaetzungTone(value: string) {
  return EINSCHAETZUNG.find((e) => e.value === value)?.tone ?? "muted";
}

// ── Qualifizierter Lead (15.2, GEKLÄRT) ──────────────────────────────────
// Automatisch aus den Kontaktdaten: Nettoeinkommen ≥ Schwelle UND
// Eigenkapital ≥ Schwelle. Konfigurierbar; kein manueller Status.
export const QUALIFIZIERT_MIN_NETTO = 2500; // €/Monat (Spanne 2.500–2.700)
export const QUALIFIZIERT_MIN_EIGENKAPITAL = 10000; // €

export function istQualifiziert(
  nettoverdienst: number | null | undefined,
  eigenkapital: number | null | undefined,
): boolean {
  return (
    (nettoverdienst ?? 0) >= QUALIFIZIERT_MIN_NETTO &&
    (eigenkapital ?? 0) >= QUALIFIZIERT_MIN_EIGENKAPITAL
  );
}

// ── Deal-Felder (Phase 4) ────────────────────────────────────────────────
export const OBJEKT_STATUS = [
  "Verfügbar",
  "Reserviert",
  "Verkauft",
] as const satisfies readonly Enums["objekt_status_enum"][];

// Finanzierungsrahmen: freier Betrag ist führend (Fachkonzept 1.1); diese
// Presets sind nur Schnellauswahl-Buttons im Formular (50k-Logik).
export const FINANZIERUNGSRAHMEN_PRESETS = [
  250000, 300000, 350000, 400000, 500000, 600000, 700000,
] as const;

// Estera-Provisionssatz auf den Kaufpreis (Schleife 2, 1.5): variabel je
// Objekt/Bauträger; diese Werte sind nur Schnellauswahl-Vorschläge.
export const PROVISIONSSATZ_PRESETS = [12, 14, 25] as const;

// Kundendokumente-Kategorien (Fachkonzept 1.2 + Call SJ 1.6: Reservierungen).
export const DOKUMENT_KATEGORIEN = [
  "Gehaltsabrechnung",
  "Selbstauskunft",
  "Ausweis",
  "Eigenkapitalnachweis",
  "Reservierungsvereinbarung",
  "Reservierungsformular",
  "Sonstige",
] as const;

// ── Kundenakte (Schleife 2, Kap. 3) ──────────────────────────────────────
export const FINANZIERUNGSSTATUS = [
  { value: "offen", label: "Offen" },
  { value: "in_pruefung", label: "In Prüfung" },
  { value: "zugesagt", label: "Zugesagt" },
] as const satisfies readonly {
  value: Enums["finanzierungsstatus_enum"];
  label: string;
}[];

export function finanzierungsstatusLabel(value: string): string {
  return FINANZIERUNGSSTATUS.find((s) => s.value === value)?.label ?? value;
}

export const ACTIVITY_TYPEN = [
  { value: "anruf", label: "Anruf" },
  { value: "mail", label: "E-Mail" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "notiz", label: "Notiz" },
] as const satisfies readonly {
  value: Exclude<Enums["activity_typ_enum"], "system">;
  label: string;
}[];

// DSGVO-Schalter (OFFEN #1, Kap. 3.3): Datei-Upload der Akte zentral
// abschaltbar, bis Speicherort/Löschkonzept/Einwilligung final geklärt sind.
// Die Checkliste „vorhanden/fehlt" funktioniert unabhängig davon.
export const DOKUMENT_UPLOAD_AKTIV = true;

export const BEREICH = [
  { value: "immobilien", label: "Immobilien" },
  { value: "vv", label: "Vermögensverwaltung" },
] as const satisfies readonly { value: Enums["bereich_enum"]; label: string }[];

export function bereichLabel(value: string): string {
  return BEREICH.find((b) => b.value === value)?.label ?? value;
}

// Kunden-Segmentierung (Call SJ 4.2) — BERECHNET, nicht gespeichert:
// „bestand" = mind. 1 gewonnener Deal · „pipeline" = mind. 1 offener Deal ·
// sonst „interessent". Die VV-Pipeline-Phase 1 heißt seit Migration 0020
// „Neuer Lead" (wie Immobilien) — „Interessent" ist exklusiv das Segment:
// wer in der Pipeline steht, ist bereits Kunde in einem frühen Stadium.
export type KundenSegment = "interessent" | "pipeline" | "bestand";

export const KUNDEN_SEGMENTE: { value: KundenSegment; label: string }[] = [
  { value: "interessent", label: "Interessent" },
  { value: "pipeline", label: "In Pipeline" },
  { value: "bestand", label: "Bestandskunde" },
];

export function kundenSegmentLabel(value: string): string {
  return KUNDEN_SEGMENTE.find((s) => s.value === value)?.label ?? value;
}
