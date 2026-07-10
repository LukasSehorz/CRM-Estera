import { cn } from "@/lib/utils";

export type PillTone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "accent"
  | "muted";

const TONE: Record<PillTone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-info/10 text-info",
  accent: "bg-primary/10 text-primary",
  muted: "bg-secondary text-muted-foreground",
};

/** Status-Pill: Statusfarbe als Text + ~10–12 % Deckkraft als Hintergrund. */
export function Pill({
  tone = "muted",
  className,
  children,
}: {
  tone?: PillTone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// ── Status -> Ton-Zuordnungen ────────────────────────────────────────────
export function kontaktStatusTone(status: string | null): PillTone {
  switch (status) {
    case "Qualifiziert":
      return "success";
    case "In Bearbeitung":
      return "warning";
    case "Neu":
      return "info";
    case "Nicht erreicht":
    case "Kalt":
    default:
      return "muted";
  }
}

export function terminStatusTone(status: string | null): PillTone {
  switch (status) {
    case "Durchgeführt":
      return "success";
    case "Vereinbart":
      return "info";
    default:
      return "muted";
  }
}

export function einschaetzungStatusTone(status: string | null): PillTone {
  switch (status) {
    case "Positiv":
      return "success";
    case "Bedingt positiv":
    case "Ausstehend":
      return "warning";
    case "Abgelehnt":
      return "danger";
    default:
      return "muted";
  }
}

export function objektStatusTone(status: string | null): PillTone {
  switch (status) {
    case "Verkauft":
      return "success";
    case "Reserviert":
      return "warning";
    case "Verfügbar":
      return "info";
    default:
      return "muted";
  }
}
