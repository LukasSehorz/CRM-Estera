import { cn } from "@/lib/utils";

/**
 * Basis-Ladefläche nach Designsystem: Surface-2, weiches Pulsieren.
 * `prefers-reduced-motion` wird respektiert (kein Pulsieren).
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-pulse rounded-md bg-surface-2 motion-reduce:animate-none",
        className,
      )}
      {...props}
    />
  );
}
