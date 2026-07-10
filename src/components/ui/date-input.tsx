import { Input } from "@/components/ui/input";

/**
 * Datums-Eingabe (TT.MM.JJJJ über das native, lokalisierte Date-Input).
 * Min/Max begrenzen das Jahr auf 4 Stellen bzw. 1900–2100 — verhindert
 * unrealistische Eingaben wie "275760".
 */
export function DateInput({
  min = "1900-01-01",
  max = "2100-12-31",
  ...props
}: React.ComponentProps<typeof Input>) {
  return <Input type="date" min={min} max={max} {...props} />;
}
