"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, CalendarDays, Loader2, Search, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type Treffer = {
  id: string;
  label: string;
  sub: string;
  href: string;
  art: "kontakt" | "deal";
};

/** Globale CRM-Suche: Kontakte + Deals, debounced, RLS-gefiltert. */
function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [offen, setOffen] = useState(false);
  const [laedt, setLaedt] = useState(false);
  const [treffer, setTreffer] = useState<Treffer[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+K fokussiert die Suche
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape") setOffen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Klick außerhalb schließt das Dropdown
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOffen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setTreffer([]);
      setLaedt(false);
      return;
    }
    setLaedt(true);
    const t = setTimeout(async () => {
      const supabase = createClient();
      const like = `%${term}%`;
      const [kontakte, deals] = await Promise.all([
        supabase
          .from("contacts")
          .select("id, vorname, nachname, email")
          .or(`vorname.ilike.${like},nachname.ilike.${like},email.ilike.${like}`)
          .limit(5),
        supabase
          .from("deals")
          .select("id, dealname, bereich")
          .ilike("dealname", like)
          .limit(5),
      ]);
      const ergebnisse: Treffer[] = [
        ...(kontakte.data ?? []).map((k) => ({
          id: k.id,
          label: `${k.vorname} ${k.nachname}`,
          sub: k.email ?? "Kontakt",
          href: `/kontakte/${k.id}`,
          art: "kontakt" as const,
        })),
        ...(deals.data ?? []).map((d) => ({
          id: d.id,
          label: d.dealname,
          sub: d.bereich === "vv" ? "Vermögensverwaltung" : "Immobilien",
          href: `/deals/${d.id}`,
          art: "deal" as const,
        })),
      ];
      setTreffer(ergebnisse);
      setLaedt(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <div ref={boxRef} className="relative w-full max-w-md">
      <div className="flex h-10 items-center gap-2 rounded-full border border-border bg-surface-2 px-4 transition-[border-color,box-shadow] duration-300 focus-within:border-accent-500/60 focus-within:shadow-[0_0_28px_-6px_color-mix(in_srgb,var(--accent-500)_55%,transparent)]">
        {laedt ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent-500" aria-hidden />
        ) : (
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        )}
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOffen(true);
          }}
          onFocus={() => setOffen(true)}
          placeholder="CRM durchsuchen — Kontakte, Deals …"
          aria-label="CRM durchsuchen"
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden shrink-0 rounded-md border border-border bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:block">
          ⌘K
        </kbd>
      </div>

      {offen && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
          {treffer.length === 0 && !laedt ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Keine Treffer für „{q.trim()}“.
            </p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {treffer.map((t) => (
                <li key={`${t.art}-${t.id}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setOffen(false);
                      setQ("");
                      router.push(t.href);
                    }}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-surface-2"
                  >
                    <span
                      className={cn(
                        "grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                        t.art === "kontakt"
                          ? "bg-accent-500/15 text-accent-400"
                          : "bg-info/15 text-info",
                      )}
                    >
                      {t.art === "kontakt" ? (
                        <User className="h-4 w-4" aria-hidden />
                      ) : (
                        <Building2 className="h-4 w-4" aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {t.label}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {t.sub}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Dashboard-Header (Midnight-Redesign): globale Suche, Datum und Profil mit
 * freigestelltem Porträt.
 */
export function MidnightHeader({
  name,
  rolle,
  fotoUrl = null,
}: {
  name: string;
  rolle: string;
  fotoUrl?: string | null;
}) {
  const initialen = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const heute = new Intl.DateTimeFormat("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur">
      {/* Signatur-Detail: feine Blau-Linie als Unterkante */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--accent-500) 55%, transparent) 30%, color-mix(in srgb, var(--accent-400) 75%, transparent) 50%, color-mix(in srgb, var(--accent-500) 55%, transparent) 70%, transparent 100%)",
        }}
      />
      <div className="flex h-16 items-center gap-4 px-6">
        <Link
          href="/dashboard"
          className="hidden shrink-0 text-base font-semibold tracking-tight md:block"
        >
          Dashboard
        </Link>

        <div className="flex min-w-0 flex-1 justify-center">
          <GlobalSearch />
        </div>

        <div className="flex shrink-0 items-center gap-4">
          <span className="hidden items-center gap-2 rounded-full border border-border bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted-foreground lg:flex">
            <CalendarDays className="h-3.5 w-3.5 text-accent-400" aria-hidden />
            {heute}
          </span>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold leading-tight">{name}</p>
              <p className="text-xs text-muted-foreground">{rolle}</p>
            </div>
            {fotoUrl ? (
              /* Freigestelltes Porträt (kein Kreis) — nur beim GF-Konto */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={fotoUrl}
                alt={name}
                className="h-12 w-auto self-end drop-shadow-[0_4px_12px_rgba(84,172,191,0.25)]"
              />
            ) : (
              <div className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface-2 text-sm font-semibold">
                {initialen}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
