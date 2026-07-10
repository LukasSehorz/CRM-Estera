import Link from "next/link";
import { AlarmClockOff, GraduationCap, Hourglass } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatEUR } from "@/lib/format";
import { einbehaltFaelligAm } from "@/lib/provision";
import {
  betragOf,
  isOpen,
  isWon,
  type AnalyticsData,
} from "@/lib/analytics";

/**
 * GF-Signale (Kap. 6): Coaching-Hinweise, bald fällige Einbehalte und
 * Deals über der Phasen-Frist — reine Sichtbarkeit, keine Eskalation (4.7).
 * Wird nur für die Geschäftsführung gerendert.
 */
export async function GfSignale({ a }: { a: AnalyticsData }) {
  const supabase = await createClient();
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 86_400_000).toISOString();
  const jetzt = now.toISOString();

  // (a) Coaching: hohe offene Pipeline, aber 0 Abschlüsse
  const coaching = a.beraterIds
    .map((id) => {
      const offene = a.deals.filter(
        (d) => d.berater_id === id && isOpen(d, a.sMap),
      );
      const gewonnene = a.deals.filter(
        (d) => d.berater_id === id && isWon(d, a.sMap),
      ).length;
      const pipeline = offene.reduce((s, d) => s + betragOf(d), 0);
      return { id, name: a.beraterMap.get(id) ?? "—", pipeline, gewonnene };
    })
    .filter((r) => r.pipeline > 0 && r.gewonnene === 0)
    .sort((x, y) => y.pipeline - x.pipeline)
    .slice(0, 4);

  // (b) Einbehalte, die in den nächsten 30 Tagen fällig werden
  const faellige = a.deals
    .filter((d) => d.bereich === "vv" && isWon(d, a.sMap) && !d.factoring)
    .map((d) => ({
      deal: d,
      faellig: einbehaltFaelligAm(d.closed_at ?? d.created_at),
      betrag: a.einbehaltOf(d),
    }))
    .filter(
      (x) =>
        x.faellig != null && x.faellig > jetzt && x.faellig <= in30 && x.betrag > 0,
    )
    .sort((x, y) => (x.faellig! < y.faellig! ? -1 : 1))
    .slice(0, 4);

  // (c) Deals über der Phasen-Frist (SLA aus 4.4)
  const offeneIds = a.deals.filter((d) => isOpen(d, a.sMap)).map((d) => d.id);
  const { data: offenerVerlauf } = offeneIds.length
    ? await supabase
        .from("deal_stage_history")
        .select("deal_id, entered_at")
        .in("deal_id", offeneIds)
        .is("left_at", null)
    : { data: [] as { deal_id: string; entered_at: string }[] };
  const enteredMap = new Map(
    (offenerVerlauf ?? []).map((h) => [h.deal_id, h.entered_at]),
  );
  const { data: slaStages } = await supabase
    .from("pipeline_stages")
    .select("id, sla_tage");
  const slaMap = new Map((slaStages ?? []).map((s) => [s.id, s.sla_tage]));
  const ueberfaellig = a.deals
    .filter((d) => isOpen(d, a.sMap))
    .map((d) => {
      const sla = slaMap.get(d.stage_id);
      const entered = enteredMap.get(d.id);
      if (sla == null || !entered) return null;
      const tage = (now.getTime() - new Date(entered).getTime()) / 86_400_000;
      return tage > Number(sla)
        ? { d, tage: Math.floor(tage), sla: Number(sla) }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((x, y) => y.tage - x.tage)
    .slice(0, 4);

  const leer =
    coaching.length === 0 && faellige.length === 0 && ueberfaellig.length === 0;
  if (leer) return null;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-base font-semibold">GF-Signale</h2>
      <p className="text-xs text-muted-foreground">
        Steuerungshinweise fürs Team — nur für die Geschäftsführung sichtbar.
      </p>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {/* Coaching: Hinweis-Charakter -> Info-Ton */}
        <SignalPanel
          icon={GraduationCap}
          title="Coaching"
          subtitle="Pipeline ohne Abschluss"
          tone="var(--info)"
          count={coaching.length}
          leerText="Keine Auffälligkeiten."
        >
          {coaching.map((c) => (
            <SignalRow
              key={c.id}
              href={`/dashboard/berater/${c.id}`}
              label={c.name}
              meta={`${formatEUR(c.pipeline)} offen · 0 Abschlüsse`}
            />
          ))}
        </SignalPanel>

        {/* Einbehalte: zeitkritisch -> Warn-Ton */}
        <SignalPanel
          icon={Hourglass}
          title="Einbehalte fällig"
          subtitle="in den nächsten 30 Tagen"
          tone="var(--warning)"
          count={faellige.length}
          leerText="Nichts fällig."
        >
          {faellige.map((f) => (
            <SignalRow
              key={f.deal.id}
              href={`/deals/${f.deal.id}`}
              label={f.deal.dealname}
              meta={`${formatEUR(f.betrag)} · fällig ${formatDate(f.faellig!)}`}
            />
          ))}
        </SignalPanel>

        {/* Phasen-Frist: überzogen -> Danger-Ton */}
        <SignalPanel
          icon={AlarmClockOff}
          title="Über der Phasen-Frist"
          subtitle="Tage in Phase / erlaubt"
          tone="var(--danger)"
          count={ueberfaellig.length}
          leerText="Alle in der Frist."
        >
          {ueberfaellig.map(({ d, tage, sla }) => (
            <SignalRow
              key={d.id}
              href={`/deals/${d.id}`}
              label={d.dealname}
              badge={`${tage} / ${sla} T`}
            />
          ))}
        </SignalPanel>
      </div>
    </div>
  );
}

/** Abgetrenntes Signal-Feld: Icon-Chip + Titel + Zähler, Einträge darunter. */
function SignalPanel({
  icon: Icon,
  title,
  subtitle,
  tone,
  count,
  leerText,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  tone: string;
  count: number;
  leerText: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col overflow-hidden rounded-lg border border-border bg-background/60">
      <header className="flex items-center gap-2.5 border-b border-border px-4 py-3">
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md"
          style={{
            background: `color-mix(in srgb, ${tone} 14%, transparent)`,
            color: tone,
          }}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{title}</p>
          <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
        {count > 0 && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums"
            style={{
              background: `color-mix(in srgb, ${tone} 14%, transparent)`,
              color: tone,
            }}
          >
            {count}
          </span>
        )}
      </header>
      {count === 0 ? (
        <p className="px-4 py-3 text-sm text-muted-foreground">{leerText}</p>
      ) : (
        <ul className="divide-y divide-border/60">{children}</ul>
      )}
    </section>
  );
}

/** Eintrag: Name als Link, Meta-Zeile darunter (statt gequetschtem Einzeiler). */
function SignalRow({
  href,
  label,
  meta,
  badge,
}: {
  href: string;
  label: string;
  meta?: string;
  badge?: string;
}) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center justify-between gap-2 px-4 py-2.5 transition-colors hover:bg-surface-2"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-foreground group-hover:underline">
            {label}
          </span>
          {meta && (
            <span className="block truncate text-xs tabular-nums text-muted-foreground">
              {meta}
            </span>
          )}
        </span>
        {badge && (
          <span className="shrink-0 rounded-full bg-danger/15 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-danger">
            {badge}
          </span>
        )}
      </Link>
    </li>
  );
}
