// =====================================================================
// Auto-Aufgaben je Statuswechsel (Schleife 2, Kap. 5.1).
// Beim Eintritt eines Deals in eine Phase werden diese Aufgaben für den
// Deal-Berater erzeugt (Duplikate werden übersprungen). Vorlagen sind
// Startvorschläge — Sebastian bestätigt/ergänzt; Anpassung nur hier.
// =====================================================================

/** Zentraler Schalter: Automatik komplett deaktivierbar (Vorgabe: nice-to-have). */
export const AUTO_AUFGABEN_AKTIV = true;

export type TaskTemplate = {
  titel: string;
  /** Fälligkeit = heute + X Tage (weglassen = ohne Termin). */
  fristTage?: number;
};

/** Schlüssel: exakter Phasenname (pipeline_stages.name) je Bereich. */
export const TASK_TEMPLATES: Record<
  "immobilien" | "vv",
  Record<string, TaskTemplate[]>
> = {
  immobilien: {
    "T1 Konzept": [
      { titel: "Konzepttermin (T2) vereinbaren", fristTage: 2 },
    ],
    "T2 Objektvorstellung": [
      { titel: "Unterlagen-Checkliste an Kunden senden" },
      { titel: "Dokumente anfordern" },
    ],
    "Objekt reserviert": [
      { titel: "Notartermin anfragen" },
      { titel: "Finanzierungsunterlagen vollständig prüfen" },
    ],
    "Finanzierung in Prüfung": [
      {
        titel: "EK-Nachweis, Selbstauskunft, Gehaltsnachweise, Schufa prüfen",
        fristTage: 14,
      },
    ],
    Notartermin: [
      { titel: "Notartermin-Datum und Fristen setzen, Erinnerung anlegen" },
    ],
  },
  // VV analog, bewusst ohne Dokumenten-Aufgaben (VV hat keine Dokumente).
  vv: {
    "Termin vereinbart": [{ titel: "Termin vorbereiten" }],
    "Strategie erstellt": [{ titel: "Abschlussgespräch terminieren" }],
  },
};
