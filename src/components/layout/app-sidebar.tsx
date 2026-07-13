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

function Brand() {
  return (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <BrandMark className="h-8 w-8" />
      <span className="text-base font-semibold tracking-tight">Estera CRM</span>
    </div>
  );
}

function NavLinks({
  isGf,
  isBackoffice,
  bereiche,
  onNavigate,
}: {
  isGf: boolean;
  isBackoffice: boolean;
  bereiche: string[];
  onNavigate?: () => void;
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
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
      {sections.map((section, i) => (
        <div key={i} className="space-y-1">
          {section.label && (
            <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
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
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary-soft/10 text-primary-soft"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                <span className="truncate">{item.label}</span>
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
}: {
  name: string;
  rolle: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="space-y-1 border-t border-border p-3">
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-xs font-semibold">
          {initials(name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{rolle}</p>
        </div>
      </div>
      <ThemeToggle />
      <form action={logout}>
        <button
          type="submit"
          onClick={onNavigate}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="h-[18px] w-[18px]" />
          <span>Abmelden</span>
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
}: {
  name: string;
  rolle: string;
  isGf: boolean;
  isBackoffice: boolean;
  bereiche: string[];
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
      <Brand />
      <NavLinks isGf={isGf} isBackoffice={isBackoffice} bereiche={bereiche} />
      <Footer name={name} rolle={rolle} />
    </aside>
  );
}

export function MobileNav({
  name,
  rolle,
  isGf,
  isBackoffice,
  bereiche,
}: {
  name: string;
  rolle: string;
  isGf: boolean;
  isBackoffice: boolean;
  bereiche: string[];
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between border-b border-border bg-sidebar px-4 py-3">
        <div className="flex items-center gap-2.5">
          <BrandMark className="h-7 w-7" />
          <span className="font-semibold">Estera CRM</span>
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
            <Footer name={name} rolle={rolle} onNavigate={close} />
          </div>
        </div>
      )}
    </div>
  );
}
