import { cn } from "@/lib/utils";

/**
 * Estera-Logo als quadratische Marken-Kachel. Die Bilddatei liegt unter
 * public/estera-logo.jpg (das Logo bringt seinen dunklen Hintergrund selbst
 * mit). Größe und Eckradius werden über className gesteuert.
 * Bewusst ein einfaches <img> (kleines statisches Asset, in Server- wie
 * Client-Komponenten nutzbar).
 */
export function BrandMark({
  className,
  alt = "Estera",
}: {
  className?: string;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/estera-logo.jpg"
      alt={alt}
      className={cn("shrink-0 rounded-md object-cover", className)}
    />
  );
}
