"use client";

import { motion } from "framer-motion";
import {
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
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent: string;
  index: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="show"
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group relative overflow-hidden rounded-xl border border-border bg-surface p-4"
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
    </motion.div>
  );
}

export function PartnerView({
  stats,
  team,
}: {
  stats: PartnerStats;
  team: TeamMember[];
}) {
  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          index={0}
          icon={Users}
          label="Berater in deiner Struktur"
          value={String(stats.partnerCount)}
          accent="var(--color-primary, #2563eb)"
        />
        <StatCard
          index={1}
          icon={Handshake}
          label="Tippgeber"
          value={String(stats.tippgeberCount)}
          accent="#f59e0b"
        />
        <StatCard
          index={2}
          icon={TrendingUp}
          label="Overhead verdient"
          value={formatEUR(stats.overhead)}
          accent="#10b981"
        />
        <StatCard
          index={3}
          icon={Trophy}
          label="Bester Partner"
          value={stats.bester || "—"}
          accent="#eab308"
        />
      </div>

      {/* Dein Team — Performance der Berater unter dir */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-base font-semibold">Dein Team</h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Wie deine Berater performen — Level, Umsatz, Provision, Zielerreichung.
        </p>
        {team.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Noch keine Berater unter dir. Sobald welche angelegt sind, siehst du
            hier ihre Performance.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {team.map((m, i) => (
              <TeamCard key={m.id} m={m} index={i} />
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
    </motion.div>
  );
}
