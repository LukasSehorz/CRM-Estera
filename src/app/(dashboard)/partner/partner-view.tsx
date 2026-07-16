"use client";

import { useRef, useState } from "react";
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

export type TeamMember = {
  id: string;
  name: string;
  level: string;
  stufe: number;
  abschluesse: number;
  umsatz: number;
  provision: number;
  ziel: number;
};

export type TippgeberMember = {
  id: string;
  name: string;
  ownerName: string;
  satz: number;
  umsatz: number;
  vermittelt: number;
};

export type OverheadPosten = { name: string; betrag: number };

export type PartnerStats = {
  partnerCount: number;
  tippgeberCount: number;
  overhead: number;
  bester: string;
};

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
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
  index: number;
  onClick?: () => void;
  active?: boolean;
  hint?: string;
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
        "group relative overflow-hidden rounded-xl border bg-surface p-4 text-left transition-colors",
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
          style={{ background: `${accent}22`, color: accent }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="truncate">{label}</span>
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
}: {
  stats: PartnerStats;
  team: TeamMember[];
  tippgeberTeam: TippgeberMember[];
  overheadBreakdown: OverheadPosten[];
}) {
  const beraterRef = useRef<HTMLDivElement>(null);
  const tippgeberRef = useRef<HTMLDivElement>(null);
  const [showOverhead, setShowOverhead] = useState(false);

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
          accent="var(--color-primary, #2563eb)"
          onClick={() => scrollTo(beraterRef)}
          hint="Zur Liste"
        />
        <StatCard
          index={1}
          icon={Handshake}
          label="Tippgeber"
          value={String(stats.tippgeberCount)}
          accent="#f59e0b"
          onClick={() => scrollTo(tippgeberRef)}
          hint="Zur Liste"
        />
        <StatCard
          index={2}
          icon={TrendingUp}
          label="Overhead verdient"
          value={formatEUR(stats.overhead)}
          accent="#10b981"
          onClick={() => setShowOverhead((v) => !v)}
          active={showOverhead}
          hint="Aufschlüsseln"
        />
        <StatCard
          index={3}
          icon={Trophy}
          label="Bester Partner"
          value={stats.bester || "—"}
          accent="#eab308"
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
              <h3 className="text-sm font-semibold">
                Overhead — woraus er sich zusammensetzt
              </h3>
              <p className="mb-3 text-xs text-muted-foreground">
                Dein Verdienst je Berater aus deiner Downline.
              </p>
              {overheadBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aktuell 0 € — es sind noch keine Berater als deine Downline
                  verknüpft. Sobald ein Berater unter dir hängt, erscheint hier
                  dein Overhead pro Person.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {overheadBreakdown.map((o, i) => (
                    <div key={o.name} className="flex items-center gap-3">
                      <span className="w-40 shrink-0 truncate text-sm">
                        {o.name}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(o.betrag / maxOverhead) * 100}%` }}
                          transition={{ duration: 0.6, delay: 0.05 + i * 0.05 }}
                          className="h-full rounded-full bg-success"
                        />
                      </div>
                      <span className="w-28 shrink-0 text-right text-sm font-semibold tabular-nums">
                        {formatEUR(o.betrag)}
                      </span>
                    </div>
                  ))}
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
              Level, Umsatz, Provision & Zielerreichung — Name anklicken für
              Details.
            </p>
          </div>
        </div>
        {team.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Berater in deiner Struktur.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {team.map((m, i) => (
              <TeamCard key={m.id} m={m} index={i} />
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
          <span className="grid h-8 w-8 place-items-center rounded-md bg-amber-500/15 text-amber-600">
            <Handshake className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-base font-semibold">Tippgeber</h2>
            <p className="text-xs text-muted-foreground">
              Wie viel Umsatz jeder Tippgeber bislang eingebracht hat.
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

function TeamCard({ m, index }: { m: TeamMember; index: number }) {
  const pct = m.ziel > 0 ? Math.min(100, (m.provision / m.ziel) * 100) : 0;
  const initials = m.name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <motion.a
      href={`/dashboard/berater/${m.id}`}
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      whileHover={{ scale: 1.015 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="block rounded-lg border border-border bg-background/40 p-4 transition-colors hover:border-primary/50"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{m.name}</div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-600">
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
    </motion.a>
  );
}

function TippgeberCard({ t, index }: { t: TippgeberMember; index: number }) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      whileHover={{ scale: 1.015 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className="rounded-lg border border-border bg-background/40 p-4"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-amber-500/15 text-amber-600">
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
      </div>
    </motion.div>
  );
}
