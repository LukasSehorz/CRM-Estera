import { Mail, MessageCircle, Phone } from "lucide-react";

/**
 * Quick Actions (9.5): anrufen · WhatsApp · Mail direkt aus der Kundenakte,
 * ohne Umweg. Reine tel:/mailto:/wa.me-Links (kein Client-JS). Buttons ohne
 * hinterlegte Daten werden ausgeblendet.
 */
export function QuickActions({
  telefon,
  email,
  name,
}: {
  telefon: string | null;
  email: string | null;
  name: string;
}) {
  // WhatsApp erwartet die Nummer ohne +, Leerzeichen oder Sonderzeichen.
  const waNummer = telefon ? telefon.replace(/[^\d]/g, "") : "";
  const aktionen = [
    telefon && {
      href: `tel:${telefon.replace(/\s/g, "")}`,
      label: "Anrufen",
      icon: Phone,
      tone: "var(--stage-1)",
    },
    waNummer && {
      href: `https://wa.me/${waNummer}`,
      label: "WhatsApp",
      icon: MessageCircle,
      tone: "var(--success)",
      extern: true,
    },
    email && {
      href: `mailto:${email}`,
      label: "E-Mail",
      icon: Mail,
      tone: "var(--info)",
    },
  ].filter(Boolean) as {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
    extern?: boolean;
  }[];

  if (aktionen.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        Schnellaktionen
      </p>
      <div className="flex flex-wrap gap-2">
        {aktionen.map((a) => {
          const Icon = a.icon;
          return (
            <a
              key={a.label}
              href={a.href}
              target={a.extern ? "_blank" : undefined}
              rel={a.extern ? "noopener noreferrer" : undefined}
              aria-label={`${a.label} — ${name}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-2"
            >
              <span style={{ color: a.tone }} className="inline-flex">
                <Icon className="h-4 w-4" />
              </span>
              {a.label}
            </a>
          );
        })}
      </div>
    </div>
  );
}
