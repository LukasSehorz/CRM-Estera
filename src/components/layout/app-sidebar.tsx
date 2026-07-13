"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CheckSquare,
  FolderOpen,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  PiggyBank,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandMark } from "@/components/layout/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { BRANDING } from "@/config/branding";
import { logout } from "@/app/(dashboard)/actions";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Nur zeigen, wenn der Nutzer diese Sparte hat (Schleife 2 / Wunsch C). */
  bereich?: "immobilien" | "vv";
};
type NavSection = { label: string | null; items: NavItem[] };

const NAV: NavSection[] = [
  {
    label: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/aufgaben", label: "Aufgaben", icon: CheckSquare },
      { href: "/kontakte", label: "Kontakte", icon: Users },
      { href: "/dokumente", label: "Dokumente", icon: FolderOpen },
      { href: "/listen", label: "Listen", icon: ListChecks },
    ],
  },
  {
    label: "Bereiche",
    items: [
      {
        href: "/immobilien",
        label: "Immobilien",
        icon: Building2,
        bereich: "immobilien",
      },
      {
        href: "/vermoegensverwaltung",
        label: "Vermögensverwaltung",
        icon: PiggyBank,
        bereich: "vv",
      },
    ],
  },
];

// Nur für die Geschäftsführung sichtbar.
const ADMIN_NAV: NavSection = {
  label: "Verwaltung",
  items: [{ href: "/team", label: "Team-Verwaltung", icon: UserCog }],
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Bei `rail` blenden Texte erst beim Aufklappen (group-hover) ein. */
const railText = (rail: boolean) =>
  rail
    ? "whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover/sidebar:opacity-100"
    : "";

function Brand({ rail = false }: { rail?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-5">
      <BrandMark className="h-8 w-8 shrink-0" />
      <span
        className={cn("text-base font-semibold tracking-tight", railText(rail))}
      >
        {BRANDING.company}
      </span>
    </div>
  );
}

function NavLinks({
  isGf,
  isBackoffice,
  bereiche,
  onNavigate,
  rail = false,
}: {
  isGf: boolean;
  isBackoffice: boolean;
  bereiche: string[];
  onNavigate?: () => void;
  rail?: boolean;
}) {
  const pathname = usePathname();
  const base = NAV.map((section) => ({
    ...section,
    items: section.items.filter((it) => {
      // Backoffice (2.5): kein provisionslastiges Dashboard.
      if (isBackoffice && it.href === "/dashboard") return false;
      return !it.bereich || isGf || bereiche.includes(it.bereich);
    }),
  })).filter((section) => section.items.length > 0);
  const sections = isGf ? [...base, ADMIN_NAV] : base;
  return (
    <nav className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-3 py-4">
      {sections.map((section, i) => (
        <div key={i} className="space-y-1">
          {section.label && (
            <p
              className={cn(
                "px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground",
                railText(rail),
              )}
            >
              {section.label}
            </p>
          )}
          {section.items.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                title={rail ? item.label : undefined}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary-soft/10 text-primary-soft"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {active && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full"
                    style={{ background: "linear-gradient(180deg, var(--accent-400), var(--pink, var(--danger)))" }}
                  />
                )}
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className={cn("truncate", railText(rail))}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

function Footer({
  name,
  rolle,
  onNavigate,
  rail = false,
  fotoUrl = null,
}: {
  name: string;
  rolle: string;
  onNavigate?: () => void;
  rail?: boolean;
  fotoUrl?: string | null;
}) {
  return (
    <div className="space-y-1 border-t border-border p-3">
      <div className="flex items-center gap-3 px-2 py-2">
        {fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fotoUrl}
            alt={name}
            className="h-8 w-8 shrink-0 rounded-full bg-secondary object-cover object-top"
          />
        ) : (
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
            {initials(name)}
          </div>
        )}
        <div className={cn("min-w-0", railText(rail))}>
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{rolle}</p>
        </div>
      </div>
      {/* Hell/Dunkel-Schalter: Hell = Light-Theme, Dunkel = Midnight-Look.
          In der Rail-Variante wird das Label (span) des Toggles wie bei
          railText() erst beim Aufklappen eingeblendet — per Arbitrary-
          Variants auf dem Wrapper, damit theme-toggle.tsx unverändert
          bleibt. px-2 gleicht die Icon-Spalte an Avatar/Abmelden an. */}
      <div
        className={cn(
          "[&>button]:px-2 [&_svg]:shrink-0",
          rail &&
            "overflow-hidden [&_span]:whitespace-nowrap [&_span]:opacity-0 [&_span]:transition-opacity [&_span]:duration-200 group-hover/sidebar:[&_span]:opacity-100",
        )}
      >
        <ThemeToggle />
      </div>
      <form action={logout}>
        <button
          type="submit"
          onClick={onNavigate}
          title={rail ? "Abmelden" : undefined}
          className="flex w-full cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          <span className={railText(rail)}>Abmelden</span>
        </button>
      </form>
    </div>
  );
}

export function DesktopSidebar({
  name,
  rolle,
  isGf,
  isBackoffice,
  bereiche,
  fotoUrl = null,
}: {
  name: string;
  rolle: string;
  isGf: boolean;
  isBackoffice: boolean;
  bereiche: string[];
  fotoUrl?: string | null;
}) {
  return (
    // Schmale Icon-Rail; fährt beim Überfahren mit der Maus über den Inhalt
    // aus (Overlay statt Reflow — der Content springt nicht).
    <aside className="sticky top-0 z-40 hidden h-screen w-[72px] shrink-0 lg:block">
      <div className="group/sidebar absolute inset-y-0 left-0 flex w-[72px] flex-col overflow-hidden border-r border-border bg-sidebar transition-[width,box-shadow] duration-300 ease-out hover:w-64 hover:shadow-[8px_0_40px_rgba(0,0,0,0.55)]">
        <Brand rail />
        <NavLinks isGf={isGf} isBackoffice={isBackoffice} bereiche={bereiche} rail />
        <Footer name={name} rolle={rolle} rail fotoUrl={fotoUrl} />
      </div>
    </aside>
  );
}

export function MobileNav({
  name,
  rolle,
  isGf,
  isBackoffice,
  bereiche,
  fotoUrl = null,
}: {
  name: string;
  rolle: string;
  isGf: boolean;
  isBackoffice: boolean;
  bereiche: string[];
  fotoUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-3">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-7 w-7" />
          <span className="font-semibold">{BRANDING.company}</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menü öffnen"
          className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={close}
            aria-hidden
          />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-sidebar shadow-xl">
            <div className="flex items-center justify-between pr-3">
              <Brand />
              <button
                type="button"
                onClick={close}
                aria-label="Menü schließen"
                className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavLinks
              isGf={isGf}
              isBackoffice={isBackoffice}
              bereiche={bereiche}
              onNavigate={close}
            />
            <Footer
              name={name}
              rolle={rolle}
              onNavigate={close}
              fotoUrl={fotoUrl}
            />
          </div>
        </div>
      )}
    </div>
  );
}
