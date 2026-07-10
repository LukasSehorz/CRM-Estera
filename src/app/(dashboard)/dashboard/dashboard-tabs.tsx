"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Übersicht" },
  { href: "/dashboard/pipeline", label: "Pipeline-Volumen" },
  { href: "/dashboard/performance", label: "Berater-Performance" },
  { href: "/dashboard/eingeschaetzt", label: "Eingeschätzte Kunden" },
];

export function DashboardTabs() {
  const pathname = usePathname();
  const params = useSearchParams();
  // Gewählten Bereich beim Tab-Wechsel mitnehmen (Bereichs-Umschalter).
  const bereich = params.get("bereich");
  const suffix = bereich ? `?bereich=${bereich}` : "";
  return (
    <div className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TABS.map((t) => {
        const active =
          t.href === "/dashboard"
            ? pathname === "/dashboard"
            : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={`${t.href}${suffix}`}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-primary-soft text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
