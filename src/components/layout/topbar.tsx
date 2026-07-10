import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Top-Bar im Content: Seitentitel + kurze Subline links, Aktionen rechts
 * (`children`, z. B. Primär-Aktion der Seite). Optionaler kleiner Zurück-Pfeil
 * (`backHref`, Wunsch Schleife 3, Punkt 11), damit man nicht über den Browser
 * zurück muss.
 */
export function Topbar({
  title,
  subtitle,
  backHref,
  children,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border bg-background/80 px-6 py-4 backdrop-blur md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Zurück"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
        )}
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
