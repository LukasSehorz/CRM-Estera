import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Klassennamen zusammenführen (shadcn/ui-Standardhelfer). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
