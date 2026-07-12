import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  ChevronRight,
  PiggyBank,
  TrendingUp,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { einbehaltFaelligAm, zahlartOf } from "@/lib/provision";
import { istQualifiziert } from "@/config/enums";
import { loadDealRows, isOffen, type DealRow } from "./lists-data";

/* -------------------------------------------------------------------------
   Listen-Hub: jede Liste zeigt live ihren Umfang (Count-Badge), die
   KPI-Karten tragen Mini-Visualisierungen. Gruppen sind über einen gedeckten
   Themen-Ton (Stage-/Gold-Token) unterscheidbar — Gold bleibt sparsam.
   ------------------------------------------------------------------------- */

type Item = {
  href: string;
  label: string;
  count?: number;
  bereich?: "immobilien" | "vv";
};
type Group = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Themen-Ton (CSS-Variable) für Chip, Dot und Kopfleiste. */
  tone: string;
  items: Item[];
  bereich?: "immobilien" | "vv";
};

// ── Datums-Helfer (identisch zur Preset-Logik in listen/deals) ────────────
function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const shift = (x.getDay() + 6) % 7; // Montag = 0
  x.setDate(x.getDate() - shift);
  return x;
}
function inRange(iso: string | null, from: Date, toExcl: Date) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t < toExcl.getTime();
}
/** „Fortgeschritten" wie in listen/kontakte (heiße Leads). */
function istFortgeschritten(pos: number, isWon: boolean) {
  return isWon || pos >= 4;
}

/** Sparten-Filter (Schleife 2 / Wunsch C): gesperrte Sparte ausblenden. */
function sichtbareGruppen(gruppen: Group[], bereiche: string[]): Group[] {
  return gruppen
    .filter((g) => !g.bereich || bereiche.includes(g.bereich))
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (it) => !it.bereich || bereiche.includes(it.bereich),
      ),
    }))
    .filter((g) => g.items.length > 0);
}

// ── Bausteine ──────────────────────────────────────────────────────────────

/**
 * Stat-Tile: jede Liste als klickbare Kachel — große Zahl (Hero), Label,
 * Pfeil-Affordance bei Hover. Zahl bleibt in Text-Tokens, der Themen-Ton
 * markiert nur die Identität (Dot) und den Hover-Rand.
 */
function ListTile({ item, tone }: { item: Item; tone: string }) {
  const leer = item.count === 0;
  return (
    <li className="min-w-0">
      <Link
        href={item.href}
        className="group relative flex h-full flex-col justify-between gap-2 overflow-hidden rounded-lg border border-border bg-background/60 p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:bg-surface-2 hover:shadow-sm"
        style={{ ["--tone" as string]: tone }}
      >
        {/* Hover: Rand + feiner Bodenstrich im Themen-Ton */}
        <span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-0.5 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          style={{ background: `linear-gradient(90deg, ${tone}, transparent 80%)` }}
          aria-hidden
        />
        <span className="flex items-start justify-between gap-2">
          <span
            className={
              "text-2xl font-bold leading-none tabular-nums " +
              (leer ? "text-muted-foreground/60" : "text-foreground")
            }
          >
            {item.count ?? "–"}
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100" />
        </span>
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: tone }}
            aria-hidden
          />
          <span className="truncate text-xs leading-snug text-muted-foreground transition-colors group-hover:text-foreground">
            {item.label}
          </span>
        </span>
      </Link>
    </li>
  );
}

function GroupCard({ group }: { group: Group }) {
  const Icon = group.icon;
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      {/* Kopfleiste im Themen-Ton — macht Gruppen auf einen Blick unterscheidbar */}
      <div
        className="h-1"
        style={{ background: `linear-gradient(90deg, ${group.tone} 0%, transparent 75%)` }}
        aria-hidden
      />
      <div className="p-5 pt-4">
        <div className="mb-3.5 flex items-center gap-2.5">
          <span
            className="grid h-9 w-9 place-items-center rounded-lg"
            style={{
              background: `color-mix(in srgb, ${group.tone} 14%, transparent)`,
              color: group.tone,
            }}
          >
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="text-base font-semibold">{group.title}</h2>
        </div>
        <ul className="grid grid-cols-2 gap-2.5">
          {group.items.map((it) => (
            <ListTile key={it.href} item={it} tone={group.tone} />
          ))}
        </ul>
      </div>
    </section>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  href,
  toneVar,
  children,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  toneVar: string;
  children?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-ring/50 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span
          className="grid h-8 w-8 place-items-center rounded-md"
          style={{
            background: `color-mix(in srgb, ${toneVar} 14%, transparent)`,
            color: toneVar,
          }}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 text-3xl font-bold tabular-nums">{value}</div>
      {children}
    </Link>
  );
}

/** Balken-Sparkline: neue Kontakte der letzten 6 Monate. */
function Sparkline({ buckets }: { buckets: { label: string; n: number }[] }) {
  const max = Math.max(1, ...buckets.map((b) => b.n));
  return (
    <div className="mt-4">
      <div className="flex h-9 items-end gap-1" aria-hidden>
        {buckets.map((b, i) => (
          <div
            key={b.label}
            className="flex-1 rounded-sm transition-opacity"
            style={{
              height: `${Math.max(8, (b.n / max) * 100)}%`,
              background:
                i === buckets.length - 1
                  ? "var(--stage-1)"
                  : "color-mix(in srgb, var(--stage-1) 35%, transparent)",
            }}
            title={`${b.label}: ${b.n}`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Neue Kontakte · letzte 6 Monate
      </p>
    </div>
  );
}

/** Verteilung der offenen Deals über die Pipeline-Phasen (Stage-Farben). */
function StageVerteilung({ offen }: { offen: DealRow[] }) {
  const byPos = new Map<number, number>();
  for (const d of offen) byPos.set(d.stagePos, (byPos.get(d.stagePos) ?? 0) + 1);
  const segs = [...byPos.entries()].sort((a, b) => a[0] - b[0]);
  const total = Math.max(1, offen.length);
  return (
    <div className="mt-4">
      <div className="flex h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        {segs.map(([pos, n]) => (
          <div
            key={pos}
            style={{
              width: `${(n / total) * 100}%`,
              background: `var(--stage-${Math.min(Math.max(pos, 1), 8)})`,
            }}
            title={`Phase ${pos}: ${n}`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Verteilung über die Pipeline-Phasen
      </p>
    </div>
  );
}

/** Anteil gewonnener Deals an allen abgeschlossenen + offenen Deals. */
function QuoteBar({ verkauft, offen }: { verkauft: number; offen: number }) {
  const total = Math.max(1, verkauft + offen);
  const pct = Math.round((verkauft / total) * 100);
  return (
    <div className="mt-4">
      <div className="h-2 overflow-hidden rounded-full bg-surface-2" aria-hidden>
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: "var(--success)" }}
        />
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        {pct} % aller Deals verkauft
      </p>
    </div>
  );
}

// ── Seite ──────────────────────────────────────────────────────────────────

export default async function ListenHubPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase
        .from("profiles")
        .select("rolle, bereich")
        .eq("id", user.id)
        .single()
    : { data: null };
  const bereiche: string[] =
    me?.rolle === "geschaeftsfuehrung" || !me?.bereich?.length
      ? ["immobilien", "vv"]
      : me.bereich;

  // Daten für Counts + Mini-Visualisierungen (RLS filtert je Rolle).
  const [{ data: contacts }, deals, { count: beraterCount }] =
    await Promise.all([
      supabase
        .from("contacts")
        .select(
          "id, interesse, termin_status, einschaetzung, nettoverdienst_monatlich, eigenkapital, created_at",
        ),
      loadDealRows(),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
    ]);
  const kontakte = contacts ?? [];
  const now = new Date();

  // Kontakt-Presets (Logik identisch zu listen/kontakte).
  const fortgeschritten = new Set(
    deals
      .filter((d) => istFortgeschritten(d.stagePos, d.isWon))
      .map((d) => d.contactId),
  );
  const cImmo = kontakte.filter((c) => c.interesse?.includes("immobilien"));
  const cVv = kontakte.filter((c) => c.interesse?.includes("vv"));
  // Eingeschätzte Kunden (15.2): nur Immobilien, Status „eingeschätzt".
  const cEing = kontakte.filter(
    (c) => c.interesse?.includes("immobilien") && c.einschaetzung === "eingeschaetzt",
  );
  // Heiß (15.2, optionales Zusatz-Signal): qualifiziert + positive
  // Einschätzung + kürzliche Aktivität (Termin durchgeführt als Proxy).
  const cHeiss = kontakte.filter(
    (c) =>
      istQualifiziert(c.nettoverdienst_monatlich, c.eigenkapital) &&
      c.einschaetzung === "eingeschaetzt" &&
      c.termin_status === "Durchgeführt" &&
      !fortgeschritten.has(c.id),
  );
  const cOffen = kontakte.filter((c) => c.termin_status === "Nicht vereinbart");

  // Deal-Presets (Logik identisch zu listen/deals).
  const wFrom = startOfWeek(now);
  const wTo = new Date(wFrom);
  wTo.setDate(wFrom.getDate() + 7);
  const tFrom = startOfDay(now);
  const tTo = new Date(tFrom);
  tTo.setDate(tFrom.getDate() + 8);
  const dNotar = deals.filter(
    (d) => d.bereich === "immobilien" && inRange(d.notartermin, wFrom, wTo),
  );
  const dTermine7 = deals.filter((d) => inRange(d.naechsterTermin, tFrom, tTo));
  const dFin = deals.filter(
    (d) =>
      d.bereich === "immobilien" && d.stageName === "Finanzierung in Prüfung",
  );
  const dVerkauft = deals.filter((d) => d.isWon);
  const dOffen = deals.filter(isOffen);
  // Einbehalt gibt es NUR mit Factoring (7.1).
  const dMitEinbehalt = deals.filter(
    (d) => d.bereich === "vv" && zahlartOf(d) === "factoring",
  );
  const dOhneEinbehalt = deals.filter(
    (d) => d.bereich === "vv" && zahlartOf(d) !== "factoring",
  );
  const dEinbehaltOffen = dMitEinbehalt.filter((d) => {
    const faelligISO = einbehaltFaelligAm(d.closedAt ?? d.createdAt);
    return faelligISO ? new Date(faelligISO).getTime() > now.getTime() : true;
  });

  // Sparkline-Buckets: neue Kontakte der letzten 6 Monate.
  const buckets: { label: string; n: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const from = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const to = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    buckets.push({
      label: from.toLocaleDateString("de-DE", { month: "short", year: "2-digit" }),
      n: kontakte.filter((c) => inRange(c.created_at, from, to)).length,
    });
  }

  const gruppen: Group[] = [
    {
      title: "Kontakte",
      icon: Users,
      tone: "var(--stage-1)",
      items: [
        { href: "/listen/kontakte?preset=alle", label: "Alle Kontakte", count: kontakte.length },
        { href: "/listen/kontakte?preset=immobilien", label: "Immobilien-Kontakte", count: cImmo.length, bereich: "immobilien" },
        { href: "/listen/kontakte?preset=vv", label: "Vermögensverwaltung-Kontakte", count: cVv.length, bereich: "vv" },
        { href: "/listen/kontakte?preset=eingeschaetzt", label: "Eingeschätzte Kunden (nach Volumen)", count: cEing.length },
        { href: "/listen/kontakte?preset=heiss", label: "Heiße Leads", count: cHeiss.length },
        { href: "/listen/kontakte?preset=offen", label: "Offene Leads", count: cOffen.length },
      ],
    },
    {
      title: "Deals & Termine",
      icon: CalendarClock,
      tone: "var(--stage-2)",
      items: [
        { href: "/listen/deals?preset=notartermine", label: "Notartermine diese Woche", count: dNotar.length, bereich: "immobilien" },
        { href: "/listen/deals?preset=termine7", label: "Nächste Termine (7 Tage)", count: dTermine7.length },
        { href: "/listen/deals?preset=finanzierung", label: "Deals in Finanzierung", count: dFin.length, bereich: "immobilien" },
        { href: "/listen/deals?preset=verkauft", label: "Verkaufte Deals", count: dVerkauft.length },
      ],
    },
    {
      title: "Provision & Einbehalt (VV)",
      icon: PiggyBank,
      tone: "var(--gold-contrast)",
      bereich: "vv",
      items: [
        { href: "/listen/deals?preset=mit-einbehalt", label: "Deals mit Einbehalt (mit Factoring)", count: dMitEinbehalt.length },
        { href: "/listen/deals?preset=ohne-einbehalt", label: "Deals ohne Einbehalt (voll sofort)", count: dOhneEinbehalt.length },
        { href: "/listen/deals?preset=einbehalt-offen", label: "Offener Einbehalt je Kunde", count: dEinbehaltOffen.length },
      ],
    },
    {
      title: "Auswertung",
      icon: BarChart3,
      tone: "var(--stage-7)",
      items: [
        { href: "/listen/berater", label: "Berater-Übersicht", count: beraterCount ?? 0 },
      ],
    },
  ];
  const sichtbar = sichtbareGruppen(gruppen, bereiche);

  return (
    <>
      <Topbar
        title="Listen & Übersichten"
        subtitle="Alle gespeicherten Listen auf einen Klick"
      />
      <div className="space-y-6 px-6 py-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard
            label="Kontakte gesamt"
            value={kontakte.length}
            icon={Users}
            href="/listen/kontakte?preset=alle"
            toneVar="var(--stage-1)"
          >
            <Sparkline buckets={buckets} />
          </KpiCard>
          <KpiCard
            label="Offene Deals"
            value={dOffen.length}
            icon={TrendingUp}
            href="/listen/deals?preset=offen"
            toneVar="var(--stage-2)"
          >
            <StageVerteilung offen={dOffen} />
          </KpiCard>
          <KpiCard
            label="Verkaufte Deals"
            value={dVerkauft.length}
            icon={BarChart3}
            href="/listen/deals?preset=verkauft"
            toneVar="var(--gold-contrast)"
          >
            <QuoteBar verkauft={dVerkauft.length} offen={dOffen.length} />
          </KpiCard>
        </div>

        <div className="grid items-start gap-4 md:grid-cols-2">
          {sichtbar.map((g) => (
            <GroupCard key={g.title} group={g} />
          ))}
        </div>
      </div>
    </>
  );
}
