import Link from "next/link";
import { AlarmClock, ArrowRight, CalendarDays, Flame } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { tageSeit } from "@/lib/health";
import { loadAnalytics, heisseLeads } from "@/lib/analytics";
import { HeuteTaskItem } from "./heute-task-item";

/**
 * „Heute"-Ansicht (Schleife 2, 4.1) — der größte Hebel: der Berater sieht
 * morgens sofort seine Handlungsliste. Bewusst unabhängig vom
 * Bereichs-Umschalter (das Tagesgeschäft kennt keine Sparten-Filter).
 */
export async function HeuteBlock({ wide = false }: { wide?: boolean }) {
  const supabase = await createClient();
  const heute = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const [
    { data: faellig },
    { data: termineHeute },
    { data: notarHeute },
    { data: offeneDeals },
    { data: aktivitaeten },
    { data: kontakteNamen },
  ] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, titel, faellig_am, contact_id")
      .eq("erledigt", false)
      .lte("faellig_am", heute)
      .order("faellig_am")
      .limit(8),
    supabase
      .from("deals")
      .select("id, dealname, naechster_termin")
      .eq("naechster_termin", heute),
    supabase
      .from("deals")
      .select("id, dealname, notartermin")
      .eq("notartermin", heute),
    supabase
      .from("deals")
      .select(
        "id, dealname, bereich, contact_id, updated_at, stage_id, pipeline_stages!inner(is_won, is_lost)",
      )
      .eq("pipeline_stages.is_won", false)
      .eq("pipeline_stages.is_lost", false),
    supabase
      .from("contact_activities")
      .select("contact_id, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase.from("contacts").select("id, vorname, nachname"),
  ]);

  const nameMap = new Map(
    (kontakteNamen ?? []).map((c) => [c.id, `${c.vorname} ${c.nachname}`]),
  );
  const letzteAkt = new Map<string, string>();
  for (const a of aktivitaeten ?? []) {
    if (!letzteAkt.has(a.contact_id)) letzteAkt.set(a.contact_id, a.created_at);
  }

  // „Verstaubte" Deals (4.1/4.4): offene Deals ohne Aktivität seit ≥ 7 Tagen
  const stale = (offeneDeals ?? [])
    .map((d) => {
      const akt = Math.min(
        tageSeit(letzteAkt.get(d.contact_id), now) ?? Number.POSITIVE_INFINITY,
        tageSeit(d.updated_at, now) ?? Number.POSITIVE_INFINITY,
      );
      return { ...d, tage: Number.isFinite(akt) ? Math.floor(akt) : null };
    })
    .filter((d) => d.tage != null && d.tage >= 7)
    .sort((a, b) => (b.tage ?? 0) - (a.tage ?? 0))
    .slice(0, 5);

  const termine = [
    ...(termineHeute ?? []).map((d) => ({ ...d, art: "Termin" })),
    ...(notarHeute ?? []).map((d) => ({ ...d, art: "Notartermin" })),
  ];

  const ueberfaellige = (faellig ?? []).filter(
    (t) => t.faellig_am != null && t.faellig_am < heute,
  ).length;

  // Heiße Leads (15.2): verkaufsreif, aber noch kein Deal — die wichtigste
  // Handlungs-Kennzahl, daher direkt hier statt versteckt in den Übersichten.
  const heiss = heisseLeads(await loadAnalytics()).length;

  // „Alles erledigt" nur, wenn auch keine heißen Leads offen sind.
  const leer =
    (faellig ?? []).length === 0 &&
    termine.length === 0 &&
    stale.length === 0 &&
    heiss === 0;

  return (
    <div
      className={
        wide
          ? "overflow-hidden rounded-2xl border-2 border-accent-500/40 bg-gradient-to-br from-accent-500/5 via-surface to-surface p-5 shadow-[0_0_40px_-16px_color-mix(in_srgb,var(--accent-500)_55%,transparent)]"
          : "overflow-hidden rounded-xl border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-300 hover:border-accent-500/40 hover:shadow-[0_0_36px_-10px_color-mix(in_srgb,var(--accent-500)_45%,transparent)]"
      }
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          {wide && (
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-500/15 text-accent-500">
              <AlarmClock className="h-5 w-5" />
            </span>
          )}
          <div>
            <h2 className={wide ? "text-lg font-semibold" : "text-base font-semibold"}>
              Heute zu tun
            </h2>
            <p className="text-xs text-muted-foreground">
              Deine Handlungsliste — fällige Aufgaben, Termine, festhängende
              Deals.
            </p>
          </div>
        </div>
        <Link
          href="/aufgaben?from=%2Fdashboard"
          className="shrink-0 text-sm font-medium text-primary hover:underline"
        >
          Alle Aufgaben →
        </Link>
      </div>

      {/* Heiße Leads (15.2): reif, aber noch kein Deal — die Zahl, bei der
          Umsatz liegen bleibt. Steht bewusst ganz oben und ist klickbar. */}
      {heiss > 0 && (
        <Link
          href="/listen/kontakte?preset=heiss"
          className="mt-4 flex items-center gap-3 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 transition-colors hover:border-danger/60 hover:bg-danger/10"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-danger/15 text-danger">
            <Flame className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">
              {heiss} heiße{heiss === 1 ? "r" : ""} Lead{heiss === 1 ? "" : "s"}{" "}
              warte{heiss === 1 ? "t" : "n"} auf dich
            </span>
            <span className="block text-xs text-muted-foreground">
              Qualifiziert, eingeschätzt, Erstgespräch gelaufen — aber noch kein
              Deal (nur Immobilien).
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-danger" />
        </Link>
      )}

      {leer ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Alles erledigt — keine fälligen Aufgaben, Termine oder festhängenden
          Deals. 🎉
        </p>
      ) : (
        // Schmal (GF, Seitenspalte) vertikal; breit (Berater-Fokus) dreispaltig.
        <div className={wide ? "mt-4 grid gap-5 lg:grid-cols-3" : "mt-4 grid gap-5"}>
          {/* Aufgaben heute + überfällig */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <AlarmClock className="h-3.5 w-3.5" />
              Aufgaben
              {ueberfaellige > 0 && (
                <span className="rounded-full bg-danger/15 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                  {ueberfaellige} überfällig
                </span>
              )}
            </p>
            {(faellig ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nichts fällig. 👍
              </p>
            ) : (
              <ul className="space-y-1">
                {(faellig ?? []).map((t) => (
                  <HeuteTaskItem
                    key={t.id}
                    id={t.id}
                    titel={t.titel}
                    faelligAm={t.faellig_am}
                    ueberfaellig={t.faellig_am != null && t.faellig_am < heute}
                    kontaktName={
                      t.contact_id ? (nameMap.get(t.contact_id) ?? null) : null
                    }
                    kontaktId={t.contact_id}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Termine des Tages */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Termine heute
            </p>
            {termine.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Termine.</p>
            ) : (
              <ul className="space-y-1">
                {termine.map((t) => (
                  <li key={`${t.art}-${t.id}`}>
                    <Link
                      href={`/deals/${t.id}`}
                      className="-mx-1.5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 rounded-md px-1.5 py-1.5 text-sm transition-colors hover:bg-surface-2"
                    >
                      <span
                        className={
                          t.art === "Notartermin"
                            ? "rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary"
                            : "rounded-full bg-info/15 px-1.5 py-0.5 text-[10px] font-semibold text-info"
                        }
                      >
                        {t.art}
                      </span>
                      <span className="truncate">{t.dealname}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Festhängende Deals */}
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <Flame className="h-3.5 w-3.5" />
              Ohne Aktivität (≥ 7 Tage)
            </p>
            {stale.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Alle Deals in Bewegung.
              </p>
            ) : (
              <ul className="space-y-1">
                {stale.map((d) => (
                  <li key={d.id}>
                    <Link
                      href={`/deals/${d.id}`}
                      className="-mx-1.5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md px-1.5 py-1.5 text-sm transition-colors hover:bg-surface-2"
                    >
                      <span className="truncate">{d.dealname}</span>
                      <span className="shrink-0 rounded-full bg-warning/15 px-1.5 py-0.5 text-[10px] font-semibold text-warning">
                        {d.tage} T
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function heuteDatum(): string {
  return formatDate(new Date().toISOString());
}
