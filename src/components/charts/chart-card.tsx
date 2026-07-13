import { cn } from "@/lib/utils";

/** Karten-Wrapper für Diagramme: Titel + optionale Subline/Aktion + Inhalt. */
export function ChartCard({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn("rounded-xl border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-300 hover:border-accent-500/40 hover:shadow-[0_0_36px_-10px_color-mix(in_srgb,var(--accent-500)_45%,transparent)]", className)}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle && (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
