import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Lock, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/utils";
import { formatEUR } from "@/lib/format";
import {
  KARRIERE_RAENGE,
  karriereFortschritt,
  type KarriereFortschritt,
} from "@/config/karriere";
import { loadAnalytics, type AnalyticsData } from "@/lib/analytics";

/**
 * Karriere (Call SJ 5.13): eigene Seite für die VV-Karriereleiter.
 * Berater: alle 5 Stufen als Leiter, eigene Position markiert, Fortschritt
 * zum nächsten Rang (BWS im Fenster). GF: Übersicht aller Berater mit
 * aktueller Stufe und Fortschritt. Der Stufenwechsel selbst bleibt eine
 * manuelle GF-Entscheidung (7.3).
 */
export default async function KarrierePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const a = await loadAnalytics();
  const now = new Date();

  if (a.isGf) {
    const rows = a.beraterIds
      .map((id) => {
        const stufe = a.stufeOf(id);
        const f = karriereFortschritt(
          stufe,
          a.fensterStartOf(id),
          bwsImFenster(a, id),
          now,
        );
        return { id, name: a.nameOf(id), stufe, f };
      })
      .sort((x, y) => y.stufe - x.stufe || x.name.localeCompare(y.name, "de"));

    return (
      <>
        <Topbar
          title="Karriere"
          subtitle="Alle Berater und ihre Stufe auf der VV-Karriereleiter"
        />
        <div className="space-y-6 px-6 py-6">
          <Leiter aktuelleStufe={null} />
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Berater</th>
                  <th className="px-4 py-3 font-medium">Rang</th>
                  <th className="px-4 py-3 font-medium">Stufe (VV)</th>
                  <th className="px-4 py-3 font-medium">BWS im Fenster</th>
                  <th className="px-4 py-3 font-medium">Bis zum nächsten Rang</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">
                      {/* Interaktiv (Feedback SJ): Name öffnet den Drilldown */}
                      <Link
                        href={`/dashboard/berater/${r.id}`}
                        className="text-primary hover:underline"
                      >
                        {r.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-gold-contrast"
                        style={{
                          background:
                            "color-mix(in srgb, var(--gold) 15%, transparent)",
                        }}
                      >
                        <Trophy className="h-3 w-3" />
                        {r.f.aktuell.rang}
                      </span>
                    </td>
                    <td className="px-4 py-3 tabular-nums">{r.stufe} %</td>
                    <td className="px-4 py-3 tabular-nums">
                      {formatEUR(r.f.bwsImFenster)}
                    </td>
                    <td className="px-4 py-3">
                      {r.f.naechster ? (
                        <div className="flex items-center gap-3">
                          <div className="h-2 w-36 overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${r.f.fortschrittPct}%` }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">
                            noch {formatEUR(r.f.restBws)} → {r.f.naechster.rang}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Höchster Rang erreicht
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  // Berater-Sicht: eigene Leiter + Fortschritt.
  const stufe = a.stufeOf(user.id);
  const f = karriereFortschritt(
    stufe,
    a.fensterStartOf(user.id),
    bwsImFenster(a, user.id),
    now,
  );

  return (
    <>
      <Topbar
        title="Karriere"
        subtitle="Deine VV-Karriereleiter — alle Stufen, deine Position, dein Fortschritt"
      />
      <div className="space-y-6 px-6 py-6">
        <FortschrittCard f={f} />
        <Leiter aktuelleStufe={f.aktuell.stufe} />
        <p className="max-w-2xl text-xs text-muted-foreground">
          Der Aufstieg wird von der Geschäftsführung bestätigt. Der BWS-Zähler
          läuft im Zeitfenster des nächsten Rangs — wird das Fenster verpasst,
          beginnt er neu. Erreichte Stufen bleiben erhalten.
        </p>
      </div>
    </>
  );
}

/** BWS der im Karriere-Fenster realisierten VV-Deals eines Beraters (7.3). */
function bwsImFenster(a: AnalyticsData, beraterId: string): number {
  const start = new Date(a.fensterStartOf(beraterId)).getTime();
  let sum = 0;
  for (const d of a.deals) {
    if (d.berater_id !== beraterId || d.bereich !== "vv") continue;
    const am = a.realisiertAm(d);
    if (am && new Date(am).getTime() >= start) sum += d.bws ?? 0;
  }
  return sum;
}

/** Aktueller Fortschritt zum nächsten Rang (Berater-Sicht). */
function FortschrittCard({ f }: { f: KarriereFortschritt }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 place-items-center rounded-full text-gold-contrast"
            style={{
              background: "color-mix(in srgb, var(--gold) 15%, transparent)",
            }}
          >
            <Trophy className="h-5 w-5" />
          </span>
          <div>
            <p className="text-base font-semibold">
              {f.aktuell.rang}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {f.aktuell.anteil} % Provisionsanteil
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Stufe {f.aktuell.stufe} von {KARRIERE_RAENGE.length}
            </p>
          </div>
        </div>
        {f.naechster && f.restTage != null && (
          <span className="rounded-full border border-border bg-surface-2 px-3 py-1 text-xs text-muted-foreground">
            Fenster: noch {f.restTage} Tage
          </span>
        )}
      </div>

      {f.naechster ? (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {formatEUR(f.bwsImFenster)} BWS im Fenster · noch{" "}
              {formatEUR(f.restBws)} bis {f.naechster.rang} (
              {f.naechster.anteil} %)
            </span>
            <span className="tabular-nums">
              {Math.round(f.fortschrittPct)} %
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-accent-gradient"
              style={{ width: `${f.fortschrittPct}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          Höchster Rang erreicht — stark!
        </p>
      )}
    </div>
  );
}

/**
 * Alle 5 Stufen als Leiter (5.13: „alle Stufen sichtbar"). `aktuelleStufe`
 * markiert die eigene Position (null = neutrale GF-Legende).
 */
function Leiter({ aktuelleStufe }: { aktuelleStufe: number | null }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-base font-semibold">Die Karriereleiter</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Vermögensverwaltung — Rang, Provisionsanteil und BWS-Schwelle im
        Zeitfenster.
      </p>
      <ol className="grid gap-3 md:grid-cols-5">
        {KARRIERE_RAENGE.map((r) => {
          const erreicht =
            aktuelleStufe != null && r.stufe < aktuelleStufe;
          const aktiv = aktuelleStufe != null && r.stufe === aktuelleStufe;
          const offen = aktuelleStufe != null && r.stufe > aktuelleStufe;
          return (
            <li
              key={r.stufe}
              className={cn(
                "relative rounded-lg border p-4 transition-colors",
                aktiv
                  ? "border-transparent bg-primary text-primary-foreground shadow-md"
                  : "border-border bg-background/40",
                offen && "opacity-75",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "grid h-7 w-7 place-items-center rounded-full text-xs font-bold",
                    aktiv
                      ? "bg-primary-foreground/20"
                      : erreicht
                        ? "bg-success/15 text-success"
                        : "bg-surface-2 text-muted-foreground",
                  )}
                >
                  {erreicht ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : offen ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    r.stufe
                  )}
                </span>
                <span
                  className={cn(
                    "text-lg font-bold tabular-nums",
                    !aktiv && "text-foreground",
                  )}
                >
                  {r.anteil} %
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold">{r.rang}</p>
              <p
                className={cn(
                  "mt-0.5 text-[11px]",
                  aktiv ? "text-primary-foreground/80" : "text-muted-foreground",
                )}
              >
                {r.schwelleBws > 0
                  ? `ab ${formatEUR(r.schwelleBws)} BWS`
                  : "Einstieg"}
                {r.fensterMonate ? ` · ${r.fensterMonate} Monate` : ""}
              </p>
              {aktiv && (
                <span className="absolute -top-2 right-3 rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-semibold text-background">
                  Du bist hier
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
