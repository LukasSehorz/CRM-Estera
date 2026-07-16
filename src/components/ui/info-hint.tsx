import { cn } from "@/lib/utils";

/**
 * ?-Tooltip (5.1 / Feedback SJ): CSS-only, per Hover UND Tastatur-Fokus
 * sichtbar — kein zusätzliches Paket, keine Portal-Logik. Trigger ist ein
 * fokussierbarer <span>, damit die Hilfe auch INNERHALB von Buttons/
 * klickbaren Karten gültig bleibt (kein verschachtelter <button>).
 */
export function InfoHint({
  text,
  align = "center",
  className,
}: {
  text: string;
  /** Wohin der Tooltip relativ zum ? aufklappt (Viewport-Ränder). */
  align?: "center" | "left" | "right";
  className?: string;
}) {
  return (
    <span className={cn("group/info relative inline-flex", className)}>
      <span
        tabIndex={0}
        role="button"
        aria-label="Erklärung anzeigen"
        className="grid h-4 w-4 cursor-help place-items-center rounded-full border border-current text-[9px] font-bold leading-none opacity-60 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        ?
      </span>
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute top-full z-40 mt-2 w-64 rounded-lg border border-border bg-surface p-2.5 text-left text-[11px] font-normal normal-case leading-relaxed text-foreground opacity-0 shadow-xl transition-opacity duration-150 group-focus-within/info:opacity-100 group-hover/info:opacity-100",
          align === "center" && "left-1/2 -translate-x-1/2",
          align === "left" && "right-0",
          align === "right" && "left-0",
        )}
      >
        {text}
      </span>
    </span>
  );
}
