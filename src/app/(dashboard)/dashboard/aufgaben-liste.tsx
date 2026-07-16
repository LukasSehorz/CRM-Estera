"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { HeuteTaskItem } from "./heute-task-item";

export type AufgabeItem = {
  id: string;
  titel: string;
  faelligAm: string | null;
  ueberfaellig: boolean;
  kontaktName: string | null;
  kontaktId: string | null;
};

/**
 * Aufgabenliste im „Heute"-Block (Feedback SJ): zeigt die fälligen/überfälligen
 * Aufgaben; per Dropdown klappen alle übrigen offenen INLINE auf — kein
 * Seitenwechsel nötig.
 */
export function AufgabenListe({
  faellig,
  weitere,
}: {
  faellig: AufgabeItem[];
  weitere: AufgabeItem[];
}) {
  const [offen, setOffen] = useState(false);

  return (
    <>
      {faellig.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nichts fällig. 👍</p>
      ) : (
        <ul className="space-y-1">
          {faellig.map((t) => (
            <HeuteTaskItem
              key={t.id}
              id={t.id}
              titel={t.titel}
              faelligAm={t.faelligAm}
              ueberfaellig={t.ueberfaellig}
              kontaktName={t.kontaktName}
              kontaktId={t.kontaktId}
            />
          ))}
        </ul>
      )}

      {weitere.length > 0 && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setOffen((v) => !v)}
            aria-expanded={offen}
            className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-primary transition-colors hover:underline"
          >
            {offen
              ? "Weitere ausblenden"
              : `${weitere.length} weitere Aufgabe${weitere.length === 1 ? "" : "n"} anzeigen`}
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${offen ? "rotate-180" : ""}`}
            />
          </button>
          {offen && (
            <ul className="mt-1 space-y-1 border-t border-border/60 pt-1">
              {weitere.map((t) => (
                <HeuteTaskItem
                  key={t.id}
                  id={t.id}
                  titel={t.titel}
                  faelligAm={t.faelligAm}
                  ueberfaellig={t.ueberfaellig}
                  kontaktName={t.kontaktName}
                  kontaktId={t.kontaktId}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </>
  );
}
