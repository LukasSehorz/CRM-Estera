"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Check, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { setImmoProvisionModus } from "./actions";

type Modus = "anteil_von_provision" | "anteil_von_kaufpreis";

const OPTIONEN: {
  value: Modus;
  titel: string;
  beschreibung: string;
  beispiel: string;
}[] = [
  {
    value: "anteil_von_provision",
    titel: "Von der Estera-Provision",
    beschreibung:
      "Der Berater-Anteil (%) wird auf die Estera-Provision gerechnet (Kaufpreis × Provisionssatz) — analog zur VV-Logik.",
    beispiel:
      "Beispiel: Kaufpreis 400.000 € × 12 % = 48.000 € Estera-Provision, davon 5 % Berater = 2.400 €.",
  },
  {
    value: "anteil_von_kaufpreis",
    titel: "Vom Kaufpreis",
    beschreibung:
      "Der Berater-Anteil (%) wird direkt auf den Kaufpreis gerechnet.",
    beispiel: "Beispiel: Kaufpreis 400.000 € × 5 % Berater = 20.000 €.",
  },
];

/**
 * Globale Einstellung (nur GF): Worauf wird der Immobilien-Berater-Anteil
 * gerechnet? (V4.1 Kap. 1.5, OFFEN #2). Wirkt sofort auf alle Provisions-,
 * Umsatz- und Overhead-Anzeigen.
 */
export function ImmoProvisionCard({ aktuell }: { aktuell: Modus }) {
  const router = useRouter();
  const [modus, setModus] = useState<Modus>(aktuell);
  const [pending, start] = useTransition();

  function waehle(value: Modus) {
    if (value === modus || pending) return;
    const vorher = modus;
    setModus(value);
    start(async () => {
      const res = await setImmoProvisionModus(value);
      if ("error" in res) {
        setModus(vorher);
        toast.error(res.error);
      } else {
        toast.success("Provisionsberechnung gespeichert");
        router.refresh();
      }
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
          <SlidersHorizontal className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-base font-semibold">
            Immobilien-Provisionsberechnung
          </h2>
          <p className="text-xs text-muted-foreground">
            Worauf wird der Berater-Anteil (%) bei Immobilien gerechnet? Wirkt
            sofort auf alle Provisions-, Umsatz- und Overhead-Anzeigen.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONEN.map((o) => {
          const aktiv = modus === o.value;
          return (
            <button
              key={o.value}
              type="button"
              disabled={pending}
              onClick={() => waehle(o.value)}
              aria-pressed={aktiv}
              className={cn(
                "flex flex-col gap-1.5 rounded-lg border p-4 text-left transition-colors disabled:opacity-60",
                aktiv
                  ? "border-primary bg-primary/5 ring-1 ring-inset ring-primary/30"
                  : "border-border hover:border-primary/40 hover:bg-surface-2",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {o.titel}
                </span>
                {aktiv && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                    <Check className="h-3 w-3" />
                    Aktiv
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{o.beschreibung}</p>
              <p className="text-xs tabular-nums text-muted-foreground/80">
                {o.beispiel}
              </p>
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Diese Vorgabe ist laut Anforderungsdokument (Kap. 1.5) noch offen — bis
        zur endgültigen Festlegung durch die Geschäftsführung ist „Von der
        Estera-Provision“ der Standard.
      </p>
    </div>
  );
}
