import { cn } from "@/lib/utils";
import { BRANDING } from "@/config/branding";

/**
 * Marken-Kachel (Logo). Quelle & Alt-Text kommen aus der Branding-Konfig,
 * damit eine White-Label-Instanz nur `BRANDING` tauschen muss (Kap. 10).
 * Bewusst ein einfaches <img> (kleines statisches Asset, in Server- wie
 * Client-Komponenten nutzbar).
 */
export function BrandMark({
  className,
  alt = BRANDING.company,
}: {
  className?: string;
  alt?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRANDING.logoSrc}
      alt={alt}
      className={cn("shrink-0 rounded-md object-cover", className)}
    />
  );
}
