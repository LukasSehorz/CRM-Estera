"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

// Ganzzahl-Stellen mit de-DE-Tausenderpunkten gruppieren ("1234567" -> "1.234.567")
function groupInt(intDigits: string): string {
  const trimmed = intDigits.replace(/^0+(?=\d)/, "");
  return trimmed.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Roh-Eingabe -> { display: "1.234,56", value: "1234.56" (kanonisch, Punkt-Dezimal) }
function parseTyped(raw: string): { display: string; value: string } {
  const s = raw.replace(/[^\d,]/g, ""); // Tausenderpunkte & sonstiges entfernen
  const ci = s.indexOf(",");
  const hasComma = ci !== -1;
  const intDigits = (hasComma ? s.slice(0, ci) : s).replace(/\D/g, "");
  const decDigits = (hasComma ? s.slice(ci + 1) : "")
    .replace(/\D/g, "")
    .slice(0, 2); // max. 2 Nachkommastellen
  const gi = groupInt(intDigits);
  const display = hasComma ? `${gi || "0"},${decDigits}` : gi;

  let value = "";
  if (intDigits !== "" || decDigits !== "") {
    value = `${intDigits || "0"}${decDigits !== "" ? "." + decDigits : ""}`;
  }
  return { display, value };
}

// Kanonischer Wert ("1234.56") -> Anzeige ("1.234,56")
function formatCanonical(canonical: string): string {
  if (!canonical) return "";
  const [i, d] = canonical.split(".");
  return parseTyped(d != null ? `${i},${d}` : i).display;
}

/**
 * Geldbetrags-Eingabe: zeigt live de-DE-formatiert (Tausenderpunkte, Komma als
 * Dezimaltrenner), gibt aber über onValueChange den reinen numerischen Wert
 * (Punkt-Dezimal, z. B. "5555555.02") nach oben — passend für numeric in der DB.
 */
export function CurrencyInput({
  value,
  onValueChange,
  ...props
}: {
  value: string;
  onValueChange: (value: string) => void;
} & Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type">) {
  const ref = useRef<HTMLInputElement>(null);
  const caretRef = useRef<number | null>(null);
  const [display, setDisplay] = useState(() => formatCanonical(value));

  // Cursor nach dem Re-Format an die richtige Stelle zurücksetzen.
  useLayoutEffect(() => {
    if (caretRef.current != null && ref.current) {
      const pos = Math.min(caretRef.current, display.length);
      ref.current.setSelectionRange(pos, pos);
      caretRef.current = null;
    }
  }, [display]);

  // Extern gesetzte Werte übernehmen (z. B. automatisch berechnete BWS),
  // ohne die laufende Tastatureingabe zu stören: nur angleichen, wenn der
  // eingehende Wert nicht dem aktuell Angezeigten entspricht.
  useEffect(() => {
    if (parseTyped(display).value !== value) {
      setDisplay(formatCanonical(value));
    }
    // Bewusst nur auf `value` reagieren (externe Änderung), nicht auf `display`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;
    const caret = e.target.selectionStart ?? raw.length;
    // Anzahl signifikanter Zeichen (Ziffern/Komma) links vom Cursor merken
    const sigLeft = raw.slice(0, caret).replace(/[^\d,]/g, "").length;

    const { display: nextDisplay, value: nextValue } = parseTyped(raw);

    // Cursor-Zielposition im neu formatierten String finden
    let pos = 0;
    let count = 0;
    while (pos < nextDisplay.length && count < sigLeft) {
      if (/[\d,]/.test(nextDisplay[pos]!)) count++;
      pos++;
    }
    caretRef.current = pos;

    setDisplay(nextDisplay);
    onValueChange(nextValue);
  }

  return (
    <Input
      ref={ref}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      placeholder="0"
      value={display}
      onChange={handleChange}
      {...props}
    />
  );
}
