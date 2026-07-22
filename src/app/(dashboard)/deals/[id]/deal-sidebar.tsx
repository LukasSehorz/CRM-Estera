import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/format";
import { bereichLabel } from "@/config/enums";
import { Pill } from "@/components/ui/pill";

export type HistoryItem = {
  id: string;
  stageName: string;
  enteredAt: string;
  leftAt: string | null;
  changedByName: string | null;
};

/** Verweildauer in einer Phase, kompakt in Deutsch. */
function dauer(from: string, to: string): string {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  if (Number.isNaN(ms) || ms < 0) return "";
  const min = Math.round(ms / 60000);
  if (min < 1) return "< 1 Min.";
  if (min < 60) return `${min} Min.`;
  const std = Math.round(min / 60);
  if (std < 48) return `${std} Std.`;
  return `${Math.round(std / 24)} Tg.`;
}

/** Gesamte Deal-Time in Tagen (kompakt) — Start bis Abschluss bzw. bis jetzt. */
function dealTimeText(startISO: string, endISO: string): string {
  const ms = new Date(endISO).getTime() - new Date(startISO).getTime();
  if (Number.isNaN(ms) || ms < 0) return "—";
  const tage = Math.floor(ms / 86_400_000);
  if (tage >= 1) return `${tage} Tag${tage === 1 ? "" : "e"}`;
  const std = Math.max(1, Math.round(ms / 3_600_000));
  return `${std} Std.`;
}

/** Kompakte Kennzahl-Kachel für den Deal (Deal-Time / Storno-Status). */
function DealKpi({
  label,
  value,
  hint,
  tone = "foreground",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "foreground" | "success" | "danger" | "primary";
}) {
  const toneCls =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : tone === "primary"
          ? "text-primary"
          : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-lg font-semibold tabular-nums", toneCls)}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children ?? value}</dd>
    </div>
  );
}

export function DealSidebar({
  bereich,
  contactId,
  contactName,
  beraterName,
  currentStageName,
  wahrscheinlichkeit,
  isWon,
  isLost,
  createdAt,
  closedAt,
  history,
}: {
  bereich: "immobilien" | "vv";
  contactId: string;
  contactName: string;
  beraterName: string;
  currentStageName: string;
  wahrscheinlichkeit: number;
  isWon: boolean;
  isLost: boolean;
  createdAt: string;
  closedAt: string | null;
  history: HistoryItem[];
}) {
  return (
    <aside className="space-y-5 pb-24 lg:pb-0">
      {/* Übersicht / Meta */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-base font-semibold">Übersicht</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <Row label="Bereich" value={bereichLabel(bereich)} />
          <Row label="Aktuelle Phase">
            <span className="inline-flex items-center gap-2">
              <Pill tone={isWon ? "success" : isLost ? "danger" : "accent"}>
                {currentStageName}
              </Pill>
              <span className="text-xs tabular-nums text-muted-foreground">
                {wahrscheinlichkeit}%
              </span>
            </span>
          </Row>
          <Row label="Kunde">
            <Link
              href={`/kontakte/${contactId}`}
              className="text-primary hover:underline"
            >
              {contactName}
            </Link>
          </Row>
          <Row label="Berater" value={beraterName} />
          <Row label="Erstellt" value={formatDate(createdAt)} />
          {closedAt && (
            <Row
              label={isLost ? "Storniert am" : "Gewonnen am"}
              value={formatDate(closedAt)}
            />
          )}
        </dl>
      </section>

      {/* Kennzahlen dieses Deals (Call SJ C3/C4): Deal-Time + Storno-Status.
          Die Aufschlüsselung der Deal-Time auf die Phasen steht im Phasen-
          Verlauf darunter. */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-base font-semibold">Kennzahlen</h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <DealKpi
            label="Deal-Time"
            value={dealTimeText(createdAt, closedAt ?? new Date().toISOString())}
            hint={isWon || isLost ? "Start bis Abschluss" : "läuft seit Start"}
          />
          <DealKpi
            label="Status"
            value={isWon ? "Gewonnen" : isLost ? "Storniert" : "Aktiv"}
            tone={isWon ? "success" : isLost ? "danger" : "primary"}
            hint={
              isLost && history.length > 1
                ? `aus „${history[1].stageName}"`
                : isWon
                  ? "Kauf abgeschlossen"
                  : currentStageName
            }
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Deal-Time = Erstkontakt bis {isWon || isLost ? "Abschluss" : "heute"}.
          Verteilung auf die Phasen im Verlauf unten.
        </p>
      </section>

      {/* Phasen-Verlauf (aus deal_stage_history) */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-base font-semibold">Phasen-Verlauf</h2>
        <p className="text-xs text-muted-foreground">
          Automatisch protokolliert bei jedem Phasenwechsel.
        </p>
        {history.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Noch kein Verlauf.
          </p>
        ) : (
          <ol className="mt-4 space-y-4">
            {history.map((h, i) => {
              const aktuell = i === 0 && !h.leftAt;
              return (
                <li
                  key={h.id}
                  className="relative pl-5 before:absolute before:left-[3px] before:top-3.5 before:h-full before:w-px before:bg-border last:before:hidden"
                >
                  <span
                    className={cn(
                      "absolute left-0 top-1.5 h-2 w-2 rounded-full",
                      aktuell ? "bg-primary" : "bg-muted-foreground/40",
                    )}
                  />
                  <div className="text-sm font-medium">{h.stageName}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(h.enteredAt)}
                    {h.leftAt
                      ? ` · ${dauer(h.enteredAt, h.leftAt)} in Phase`
                      : " · aktuell"}
                  </div>
                  {h.changedByName && (
                    <div className="text-xs text-muted-foreground">
                      durch {h.changedByName}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </aside>
  );
}
