import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Wiederverwendbare Lade-Skeletons für ganze Seiten. Jede loading.tsx setzt
 * diese Bausteine so zusammen, dass der Umriss der echten Seite entsteht —
 * keine weißen Sprünge, keine Layout-Verschiebung beim Laden.
 */

/** Platzhalter für die Topbar (Titel + Subline, optional Primär-Aktion). */
export function TopbarSkeleton({ action = false }: { action?: boolean }) {
  return (
    <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
      <div className="space-y-2">
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-4 w-64 max-w-[60vw]" />
      </div>
      {action && <Skeleton className="h-9 w-36" />}
    </div>
  );
}

/** KPI-Kartenreihe (3 oder 4 Karten). */
export function KpiRowSkeleton({ count = 4 }: { count?: 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid gap-4",
        count === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2 xl:grid-cols-4",
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <Skeleton className="mt-3 h-8 w-32" />
        </div>
      ))}
    </div>
  );
}

/** Karte mit Titelzeile + Inhaltsfläche (z. B. Chart oder Liste). */
export function CardSkeleton({
  bodyClassName = "h-60",
  className,
}: {
  bodyClassName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn("rounded-xl border border-border bg-surface p-5", className)}
    >
      <Skeleton className="h-5 w-40" />
      <Skeleton className="mt-2 h-3.5 w-56 max-w-full" />
      <Skeleton className={cn("mt-4 w-full", bodyClassName)} />
    </div>
  );
}

/** Tabellen-Platzhalter: Kopfzeile + n Zeilen. */
export function TableSkeleton({
  rows = 8,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex gap-4 border-b border-border px-4 py-3">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex gap-4 border-b border-border px-4 py-3.5 last:border-0"
        >
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-4 flex-1", c === 0 && "max-w-40")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Kanban-Board-Platzhalter: Spalten mit Karten-Umrissen. */
export function BoardSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden pb-2">
      {Array.from({ length: columns }).map((_, i) => (
        <div
          key={i}
          className="w-80 shrink-0 rounded-xl border border-border bg-surface p-3"
        >
          <div className="flex items-center justify-between px-1 pb-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: i % 2 === 0 ? 3 : 2 }).map((_, j) => (
              <Skeleton key={j} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/** Formular-Platzhalter: Sektionen mit Label/Feld-Paaren + Aktionszeile. */
export function FormSkeleton({ fields = 6 }: { fields?: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <Skeleton className="h-5 w-36" />
      <div className="mt-5 grid gap-x-4 gap-y-5 sm:grid-cols-2">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-36" />
      </div>
    </div>
  );
}

/** Tab-Leiste der Dashboards. */
export function TabsSkeleton() {
  return (
    <div className="flex gap-6 border-b border-border pb-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-28" />
      ))}
    </div>
  );
}
