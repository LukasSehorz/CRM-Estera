"use client";

import { useId } from "react";
import { DateInput } from "@/components/ui/date-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ZEITRAEUME, type ZeitraumWert } from "@/lib/zeitraum";

export type ZeitraumAuswahl = {
  wert: ZeitraumWert;
  von: string;
  bis: string;
};

export const ZEITRAUM_ALLE: ZeitraumAuswahl = { wert: "alle", von: "", bis: "" };

/**
 * Auswahl „Gesamter Zeitraum / Monat / Quartal / Jahr / eigener Zeitraum“.
 * Wird in der Kundenliste (Kunde seit) und im Deal-Board (Abschluss) genutzt.
 */
export function ZeitraumFilter({
  value,
  onChange,
  label = "Zeitraum",
  className = "sm:w-48",
}: {
  value: ZeitraumAuswahl;
  onChange: (v: ZeitraumAuswahl) => void;
  /** Wofür der Zeitraum gilt — steht als Präfix im Auswahlfeld. */
  label?: string;
  className?: string;
}) {
  const hinweisId = useId();
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Select
        value={value.wert}
        onValueChange={(w) => onChange({ ...value, wert: w as ZeitraumWert })}
      >
        <SelectTrigger className={className} aria-label={`${label}: Zeitraum`}>
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {ZEITRAEUME.map((z) => (
            <SelectItem key={z.value} value={z.value}>
              {label}: {z.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {value.wert === "custom" && (() => {
        const verdreht = Boolean(value.von && value.bis && value.von > value.bis);
        return (
        <div className="flex flex-wrap items-center gap-2">
          <DateInput
            aria-label={`${label}: von`}
            aria-invalid={verdreht}
            aria-describedby={verdreht ? hinweisId : undefined}
            value={value.von}
            onChange={(e) => onChange({ ...value, von: e.target.value })}
            className="sm:w-40"
          />
          <span className="text-sm text-muted-foreground">bis</span>
          <DateInput
            aria-label={`${label}: bis`}
            aria-invalid={verdreht}
            aria-describedby={verdreht ? hinweisId : undefined}
            value={value.bis}
            onChange={(e) => onChange({ ...value, bis: e.target.value })}
            className="sm:w-40"
          />
          {/* Verdrehter Zeitraum liefert sonst kommentarlos eine leere Liste. */}
          {verdreht && (
            <span
              id={hinweisId}
              role="alert"
              className="w-full text-xs text-danger sm:w-auto"
            >
              „von“ liegt nach „bis“ — bitte tauschen.
            </span>
          )}
        </div>
        );
      })()}
    </div>
  );
}
