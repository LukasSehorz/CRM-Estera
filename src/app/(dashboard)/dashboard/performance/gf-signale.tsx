import Link from "next/link";
import { AlarmClockOff, FileWarning, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatEUR } from "@/lib/format";
import {
  betragOf,
  isOpen,
  isWon,
  type AnalyticsData,
} from "@/lib/analytics";

/**
 * GF-Signale (Kap. 6): Coaching-Hinweise, unvollständige Kundenakten (5.8)
 * und Deals über der Phasen-Frist — reine Sichtbarkeit, keine Eskalation
 * (4.7). „Einbehalte fällig" wurde entfernt (5.7): die Auszahlung läuft
 * automatisch, das Signal hatte keinen Steuerungswert.
 * Wird nur für die Geschäftsführung gerendert.
 */
export async function GfSignale({ a }: { a: AnalyticsData }) {
  const supabase = await createClient();
  const now = new Date();

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

  // (b) Fehlende Dokumente (5.8): Immobilien-Kunden mit unvollständiger
  // Checklisten-Akte. Quelle ist das granulare Checklisten-System
  // (document_types + Status + hochgeladene Dateien), nicht das alte
  // Freitext-Flag. RLS: GF sieht alle Kunden.
  const [
    { data: aktenKunden },
    { data: docTypes },
    { data: docStatus },
    { data: docFiles },
  ] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, vorname, nachname, interesse, ist_selbststaendig, ist_immobilienbesitzer"),
    supabase.from("document_types").select("id, gruppe").eq("aktiv", true),
    supabase
      .from("contact_document_status")
      .select("contact_id, document_type_id, vorhanden"),
    supabase.from("contact_documents").select("contact_id, document_type_id"),
  ]);
  const vorhandenSet = new Set<string>();
  for (const s of docStatus ?? [])
    if (s.vorhanden) vorhandenSet.add(`${s.contact_id}:${s.document_type_id}`);
  for (const f of docFiles ?? [])
    if (f.document_type_id)
      vorhandenSet.add(`${f.contact_id}:${f.document_type_id}`);
  const fehlendeAkten = (aktenKunden ?? [])
    .filter((k) => (k.interesse ?? []).includes("immobilien"))
    .map((k) => {
      const anwendbar = (docTypes ?? []).filter(
        (t) =>
          t.gruppe === "allgemein" ||
          (t.gruppe === "selbststaendig" && k.ist_selbststaendig) ||
          (t.gruppe === "immobilienbesitzer" && k.ist_immobilienbesitzer),
      );
      const fehlt = anwendbar.filter(
        (t) => !vorhandenSet.has(`${k.id}:${t.id}`),
      ).length;
      return {
        id: k.id,
        name: `${k.vorname} ${k.nachname}`,
        fehlt,
        gesamt: anwendbar.length,
      };
    })
    .filter((r) => r.fehlt > 0)
    .sort((x, y) => y.fehlt - x.fehlt)
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
    coaching.length === 0 &&
    fehlendeAkten.length === 0 &&
    ueberfaellig.length === 0;
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

        {/* Fehlende Dokumente (5.8): unvollständige Kundenakte -> Warn-Ton */}
        <SignalPanel
          icon={FileWarning}
          title="Fehlende Dokumente"
          subtitle="unvollständige Kundenakte"
          tone="var(--warning)"
          count={fehlendeAkten.length}
          leerText="Alle Akten vollständig."
        >
          {fehlendeAkten.map((k) => (
            <SignalRow
              key={k.id}
              href={`/kontakte/${k.id}`}
              label={k.name}
              meta={`${k.fehlt} von ${k.gesamt} Unterlagen fehlen`}
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
