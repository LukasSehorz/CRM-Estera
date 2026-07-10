"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { BereichScope } from "@/lib/analytics";

const LABEL: Record<BereichScope, string> = {
  gesamt: "Gesamt",
  immobilien: "Immobilien",
  vv: "Vermögensverwaltung",
};

/**
 * Bereichs-Umschalter der Dashboards (Schleife 2 / Wunsch A): alle
 * Kennzahlen strikt je Sparte, "Gesamt" nur wo beide Sparten erlaubt sind.
 * Zustand liegt in der URL (?bereich=…), damit Server Components filtern
 * und Links teilbar bleiben.
 */
export function BereichSwitcher({
  aktiv,
  erlaubt,
}: {
  aktiv: BereichScope;
  erlaubt: BereichScope[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Nur eine Sparte erlaubt -> nichts umzuschalten.
  if (erlaubt.length <= 1) return null;

  function wechseln(scope: BereichScope) {
    const next = new URLSearchParams(params.toString());
    next.set("bereich", scope);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`));
  }

  return (
    <div
      role="tablist"
      aria-label="Bereich wählen"
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border border-border bg-surface p-1",
        pending && "opacity-70",
      )}
    >
      {erlaubt.map((s) => (
        <button
          key={s}
          type="button"
          role="tab"
          aria-selected={aktiv === s}
          onClick={() => wechseln(s)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            aktiv === s
              ? "bg-primary-soft/15 text-primary-soft"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          {LABEL[s]}
        </button>
      ))}
    </div>
  );
}
