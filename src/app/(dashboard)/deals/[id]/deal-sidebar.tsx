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
          <Row label="Kontakt">
            <Link
              href={`/kontakte/${contactId}`}
              className="text-primary hover:underline"
            >
              {contactName}
            </Link>
          </Row>
          <Row label="Berater" value={beraterName} />
          <Row label="Erstellt" value={formatDate(createdAt)} />
          {closedAt && <Row label="Gewonnen am" value={formatDate(closedAt)} />}
        </dl>
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
