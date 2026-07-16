"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  Handshake,
  Trophy,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatEUR } from "@/lib/format";
import { InfoHint } from "@/components/ui/info-hint";

/** Abgeschlossener Deal eines Team-Beraters (aufklappbare Karte). */
export type TeamDealDetail = {
  dealId: string;
  dealname: string;
  bereich: "immobilien" | "vv";
  volumen: number;
};

export type TeamMember = {
  id: string;
  name: string;
  level: string;
  stufe: number;
  abschluesse: number;
  umsatz: number;
  provision: number;
  ziel: number;
  deals: TeamDealDetail[];
};

/** Einzel-Deal in der Tippgeber-Aufschlüsselung (Feedback SJ). */
export type TippgeberDealDetail = {
  dealId: string;
  dealname: string;
  bereich: "immobilien" | "vv";
  beraterName: string;
  volumen: number;
  anteil: number; // Tippgeber-Provision aus diesem Deal (nur VV)
};

export type TippgeberMember = {
  id: string;
  name: string;
  ownerName: string;
  satz: number;
  umsatz: number;
  vermittelt: number;
  deals: TippgeberDealDetail[];
};

/** Einzel-Deal in der Overhead-Rechnung (Feedback SJ). */
export type OverheadDealDetail = {
  dealId: string;
  dealname: string;
  bereich: "immobilien" | "vv";
  beraterName: string;
  betrag: number;
  formel: string;
};

export type OverheadPosten = {
  name: string;
  betrag: number;
  deals: OverheadDealDetail[];
};

export type PartnerStats = {
  partnerCount: number;
  tippgeberCount: number;
  overhead: number;
  bester: string;
};

const BEREICH_LABEL: Record<"immobilien" | "vv", string> = {
  immobilien: "Immobilien",
  vv: "Vermögensverwaltung",
};

function bereichGruppen<T extends { bereich: "immobilien" | "vv" }>(
  deals: T[],
): { bereich: "immobilien" | "vv"; items: T[] }[] {
  return (["vv", "immobilien"] as const)
    .map((b) => ({ bereich: b, items: deals.filter((d) => d.bereich === b) }))
    .filter((g) => g.items.length > 0);
}

const OVERHEAD_INFO =
  "Differenzmodell über alle Ebenen: Bei jedem Abschluss in deiner Downline verdienst du die Differenz zwischen deiner Anbindung und der deines direkten Partners in diesem Ast — bei VV über die Stufe (% der Provisionsbasis), bei Immobilien über den Immo-Anteil (% vom Kaufpreis). In der Aufschlüsselung zeigt ein Klick auf den Berater die Rechnung je Deal.";

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4, ease: "easeOut" as const },
  }),
};

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
  index,
  onClick,
  active = false,
  hint,
  info,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
  index: number;
  onClick?: () => void;
  active?: boolean;
  hint?: string;
  info?: string;
}) {
  const clickable = !!onClick;
  return (
    <motion.button
      type="button"
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      whileHover={clickable ? { y: -4, scale: 1.02 } : undefined}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      onClick={onClick}
      disabled={!clickable}
      className={cn(
        "group relative overflow-visible rounded-xl border bg-surface p-4 text-left transition-colors",
        clickable ? "cursor-pointer hover:border-primary/50" : "cursor-default",
        active ? "border-primary ring-1 ring-primary" : "border-border",
      )}
    >
      {/* Farbverlauf, der beim Hover aufleuchtet */}
      <div
        className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-15 blur-2xl transition-opacity duration-300 group-hover:opacity-40"
        style={{ background: accent }}
      />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span
          className="grid h-7 w-7 place-items-center rounded-md"
          style={{
            background: `color-mix(in srgb, ${accent} 15%, transparent)`,
            color: accent,
          }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate">{label}</span>
        {info && <InfoHint text={info} align="left" />}
      </div>
      <div className="mt-2 truncate text-2xl font-semibold tabular-nums">
        {value}
      </div>
      {clickable && hint && (
        <div className="mt-1 flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
          {hint}
          <ChevronDown
            className={cn(
              "h-3 w-3 transition-transform",
              active ? "rotate-180" : "-rotate-90",
            )}
          />
        </div>
      )}
    </motion.button>
  );
}

export function PartnerView({
  stats,
  team,
  tippgeberTeam,
  overheadBreakdown,
  isGf = false,
}: {
  stats: PartnerStats;
  team: TeamMember[];
  tippgeberTeam: TippgeberMember[];
  overheadBreakdown: OverheadPosten[];
  /** Nur die GF darf den Berater-Drilldown öffnen (Route ist GF-only). */
  isGf?: boolean;
}) {
  const beraterRef = useRef<HTMLDivElement>(null);
  const tippgeberRef = useRef<HTMLDivElement>(null);
  const [showOverhead, setShowOverhead] = useState(false);
  const [openPosten, setOpenPosten] = useState<string | null>(null);

  const scrollTo = (ref: React.RefObject<HTMLDivElement | null>) =>
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const maxOverhead = Math.max(1, ...overheadBreakdown.map((o) => o.betrag));

  return (
    <div className="space-y-6">
      {/* KPIs — anklickbar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          index={0}
          icon={Users}
          label="Berater in deiner Struktur"
          value={String(stats.partnerCount)}
          accent="var(--primary)"
          onClick={() => scrollTo(beraterRef)}
          hint="Zur Liste"
        />
        <StatCard
          index={1}
          icon={Handshake}
          label="Tippgeber"
          value={String(stats.tippgeberCount)}
          accent="var(--gold)"
          onClick={() => scrollTo(tippgeberRef)}
          hint="Zur Liste"
        />
        <StatCard
          index={2}
          icon={TrendingUp}
          label="Overhead verdient"
          value={formatEUR(stats.overhead)}
          accent="var(--success)"
          onClick={() => setShowOverhead((v) => !v)}
          active={showOverhead}
          hint="Aufschlüsseln"
          info={OVERHEAD_INFO}
        />
        <StatCard
          index={3}
          icon={Trophy}
          label="Bester Partner"
          value={stats.bester || "—"}
          accent="var(--gold-soft)"
          onClick={() => scrollTo(beraterRef)}
          hint="Meiste Umsätze"
        />
      </div>

      {/* Overhead-Aufschlüsselung (KPI-Klick) */}
      <AnimatePresence initial={false}>
        {showOverhead && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border bg-surface p-5">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-semibold">
                  Overhead — woraus er sich zusammensetzt
                </h3>
                <InfoHint text={OVERHEAD_INFO} align="right" />
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Dein Verdienst je Berater-Ast. Zeile anklicken — die Rechnung je
                Deal, getrennt nach Sparte.
              </p>
              {overheadBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aktuell 0 € — es sind noch keine Berater als deine Downline
                  verknüpft. Sobald ein Berater unter dir hängt, erscheint hier
                  dein Overhead pro Person.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {overheadBreakdown.map((o) => {
                    const offen = openPosten === o.name;
                    return (
                      <div key={o.name}>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenPosten((v) => (v === o.name ? null : o.name))
                          }
                          className="flex w-full items-center gap-3 rounded-md px-1.5 py-1.5 text-left transition-colors hover:bg-surface-2"
                          aria-expanded={offen}
                        >
                          <span className="w-40 shrink-0 truncate text-sm">
                            {o.name}
                          </span>
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{
                                width: `${(o.betrag / maxOverhead) * 100}%`,
                              }}
                              transition={{ duration: 0.6, delay: 0.05 }}
                              className="h-full rounded-full bg-success"
                            />
                          </div>
                          <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums">
                            {formatEUR(o.betrag)}
                          </span>
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                              offen && "rotate-180",
                            )}
                          />
                        </button>
                        <AnimatePresence initial={false}>
                          {offen && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.22, ease: "easeOut" }}
                              className="overflow-hidden"
                            >
                              <div className="mb-2 ml-1.5 mt-1 space-y-3 rounded-lg border border-border/70 bg-background/50 p-3">
                                {bereichGruppen(o.deals).map((g) => (
                                  <div key={g.bereich}>
                                    <div className="mb-1.5 flex items-center justify-between border-b border-border/60 pb-1 text-[11px] font-medium text-muted-foreground">
                                      <span>{BEREICH_LABEL[g.bereich]}</span>
                                      <span className="tabular-nums">
                                        {formatEUR(
                                          g.items.reduce(
                                            (s, d) => s + d.betrag,
                                            0,
                                          ),
                                        )}
                                      </span>
                                    </div>
                                    <ul className="space-y-2">
                                      {g.items.map((d) => (
                                        <li
                                          key={d.dealId}
                                          className="flex items-start justify-between gap-3"
                                        >
                                          <div className="min-w-0">
                                            <p className="truncate text-xs font-medium">
                                              {d.dealname}
                                              <span className="font-normal text-muted-foreground">
                                                {" "}
                                                · Abschluss von {d.beraterName}
                                              </span>
                                            </p>
                                            <p className="text-[11px] leading-relaxed text-muted-foreground">
                                              {d.formel}
                                            </p>
                                          </div>
                                          <span className="shrink-0 text-xs font-semibold tabular-nums text-success">
                                            + {formatEUR(d.betrag)}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Berater */}
      <div
        ref={beraterRef}
        className="scroll-mt-4 rounded-xl border border-border bg-surface p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Berater</h2>
            <p className="text-xs text-muted-foreground">
              Level, Umsatz, Provision & Zielerreichung — Karte anklicken für
              die Abschlüsse{isGf ? ", Name öffnet den Drilldown" : ""}.
            </p>
          </div>
        </div>
        {team.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Berater in deiner Struktur.
          </p>
        ) : (
          <div className="grid items-start gap-3 md:grid-cols-2">
            {team.map((m, i) => (
              <TeamCard key={m.id} m={m} index={i} isGf={isGf} />
            ))}
          </div>
        )}
      </div>

      {/* Tippgeber */}
      <div
        ref={tippgeberRef}
        className="scroll-mt-4 rounded-xl border border-border bg-surface p-5"
      >
        <div className="mb-4 flex items-center gap-2">
          <span
            className="grid h-8 w-8 place-items-center rounded-md text-gold-contrast"
            style={{ background: "color-mix(in srgb, var(--gold) 15%, transparent)" }}
          >
            <Handshake className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Tippgeber</h2>
            <p className="text-xs text-muted-foreground">
              Wie viel Umsatz jeder Tippgeber bislang eingebracht hat — Karte
              anklicken für die einzelnen Deals.
            </p>
          </div>
        </div>
        {tippgeberTeam.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Tippgeber angelegt.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {tippgeberTeam.map((t, i) => (
              <TippgeberCard key={t.id} t={t} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamCard({
  m,
  index,
  isGf,
}: {
  m: TeamMember;
  index: number;
  isGf: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pct = m.ziel > 0 ? Math.min(100, (m.provision / m.ziel) * 100) : 0;
  const initials = m.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      whileHover={{ scale: open ? 1 : 1.015 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={cn(
        "self-start rounded-lg border bg-background/40 transition-colors",
        open ? "border-primary/40" : "border-border hover:border-primary/50",
      )}
    >
      {/* Karte klappt auf und zeigt die Abschlüsse (Feedback SJ) — der
          Drilldown-Link am Namen bleibt der GF vorbehalten (Route GF-only). */}
      <div
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="w-full cursor-pointer p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">
              {isGf ? (
                <Link
                  href={`/dashboard/berater/${m.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="hover:text-primary hover:underline"
                >
                  {m.name}
                </Link>
              ) : (
                m.name
              )}
            </div>
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium text-gold-contrast"
              style={{ background: "color-mix(in srgb, var(--gold) 15%, transparent)" }}
            >
              <Trophy className="h-3 w-3" />
              {m.level}
            </span>
          </div>
          <div className="text-right">
            <div className="text-lg font-semibold tabular-nums">
              {formatEUR(m.umsatz)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {m.abschluesse} Abschl.
            </div>
          </div>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </div>

        {/* Zielerreichung (Provision vs. Monatsziel) */}
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Provision {formatEUR(m.provision)}</span>
            <span>{m.ziel > 0 ? `Ziel ${formatEUR(m.ziel)}` : "kein Ziel"}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, delay: 0.15 + index * 0.05, ease: "easeOut" }}
              className={cn(
                "h-full rounded-full",
                pct >= 100 ? "bg-success" : "bg-primary",
              )}
            />
          </div>
        </div>
      </div>

      {/* Aufschlüsselung: welche Deals abgeschlossen wurden */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/70 px-4 py-3">
              {m.deals.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Noch keine abgeschlossenen Deals.
                </p>
              ) : (
                <div className="space-y-3">
                  {bereichGruppen(m.deals).map((g) => (
                    <div key={g.bereich}>
                      <div className="mb-1.5 flex items-center justify-between border-b border-border/60 pb-1 text-[11px] font-medium text-muted-foreground">
                        <span>{BEREICH_LABEL[g.bereich]}</span>
                        <span className="tabular-nums">
                          {formatEUR(
                            g.items.reduce((s, d) => s + d.volumen, 0),
                          )}
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {g.items.map((d) => (
                          <li
                            key={d.dealId}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="min-w-0 truncate text-xs font-medium">
                              {d.dealname}
                            </span>
                            <span className="shrink-0 text-xs font-semibold tabular-nums">
                              {formatEUR(d.volumen)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function TippgeberCard({ t, index }: { t: TippgeberMember; index: number }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      whileHover={{ scale: open ? 1 : 1.015 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={cn(
        "self-start rounded-lg border bg-background/40 transition-colors",
        open ? "border-primary/40" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-gold-contrast"
          style={{ background: "color-mix(in srgb, var(--gold) 15%, transparent)" }}
        >
          <Handshake className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{t.name}</div>
          <div className="truncate text-[11px] text-muted-foreground">
            über {t.ownerName}
            {t.satz > 0 ? ` · ${t.satz} % Provision` : ""}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-semibold tabular-nums">
            {formatEUR(t.umsatz)}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {t.vermittelt > 0
              ? `${t.vermittelt} vermittelt`
              : "noch nichts vermittelt"}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Aufschlüsselung: welche Deals die Summe ergeben (Feedback SJ) */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/70 px-4 py-3">
              {t.deals.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Noch keine Deals zugeordnet. Wähle den Tippgeber beim
                  VV-Deal im Feld „Tippgeber“ aus — dann zählt sein Umsatz
                  hier.
                </p>
              ) : (
                <div className="space-y-3">
                  {bereichGruppen(t.deals).map((g) => (
                    <div key={g.bereich}>
                      <div className="mb-1.5 flex items-center justify-between border-b border-border/60 pb-1 text-[11px] font-medium text-muted-foreground">
                        <span>{BEREICH_LABEL[g.bereich]}</span>
                        <span className="tabular-nums">
                          {formatEUR(
                            g.items.reduce((s, d) => s + d.volumen, 0),
                          )}
                        </span>
                      </div>
                      <ul className="space-y-2">
                        {g.items.map((d) => (
                          <li
                            key={d.dealId}
                            className="flex items-start justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium">
                                {d.dealname}
                                <span className="font-normal text-muted-foreground">
                                  {" "}
                                  · Abschluss von {d.beraterName}
                                </span>
                              </p>
                              {d.anteil > 0 && (
                                <p className="text-[11px] text-muted-foreground">
                                  davon Tippgeber-Provision{" "}
                                  {formatEUR(d.anteil)} ({t.satz} % der
                                  Provisionsbasis)
                                </p>
                              )}
                            </div>
                            <span className="shrink-0 text-xs font-semibold tabular-nums">
                              {formatEUR(d.volumen)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
