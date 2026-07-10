import { formatEURCents } from "@/lib/format";
import { bereichLabel } from "@/config/enums";
import {
  summenSkala,
  type AnalyticsData,
  type SummenSkala,
} from "@/lib/analytics";

/**
 * Abzugs-Bestandteile der Skala — Farben ausschließlich über Tokens
 * (Design-System §2: Einbehalt = warning, Tippgeber = info,
 * Berater-Provision = Stahlblau). Gold bleibt dem Netto vorbehalten.
 */
const ABZUEGE = [
  { key: "einbehalt", label: "Einbehalt (15 %, geparkt)", farbe: "var(--warning)" },
  { key: "tippgeber", label: "Tippgeber-Anteile", farbe: "var(--info)" },
  { key: "beraterProvision", label: "Berater-Provisionen", farbe: "var(--stage-1)" },
] as const;

function pct(teil: number, brutto: number): number {
  if (brutto <= 0) return 0;
  return Math.max(0, Math.min(100, (teil / brutto) * 100));
}

function SkalaKarte({
  titel,
  s,
  hervorgehoben = false,
}: {
  titel: string;
  s: SummenSkala;
  hervorgehoben?: boolean;
}) {
  const nettoPct = pct(s.esteraNetto, s.brutto);
  // Segmente der Kompositions-Leiste: Netto (Gold) + Abzüge, in Zeilen-Reihenfolge.
  const segmente = [
    { key: "netto", anteil: nettoPct, farbe: "var(--accent-gradient)" },
    ...ABZUEGE.map((a) => ({
      key: a.key,
      anteil: pct(s[a.key], s.brutto),
      farbe: a.farbe,
    })),
  ].filter((seg) => seg.anteil > 0);

  return (
    <div
      className={
        hervorgehoben
          ? "rounded-xl border border-border border-t-2 border-t-gold/70 bg-surface p-5"
          : "rounded-xl border border-border bg-surface p-5"
      }
    >
      <h3 className="text-sm font-semibold text-muted-foreground">{titel}</h3>

      {s.brutto <= 0 ? (
        <p className="py-8 text-sm text-muted-foreground">
          Noch keine gewonnenen Deals in diesem Bereich.
        </p>
      ) : (
        <>
          {/* Hero: die Zahl, die zählt — was bei Estera liquide bleibt */}
          <div className="mt-3">
            <div className="text-xs text-muted-foreground">
              Estera-Netto (liquide)
            </div>
            <div className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
              {formatEURCents(s.esteraNetto)}
            </div>
            <div className="mt-1.5 text-xs text-muted-foreground">
              <span className="font-semibold text-gold-contrast tabular-nums">
                {Math.round(nettoPct)} %
              </span>{" "}
              von {formatEURCents(s.brutto)} Summe X bleiben liquide
            </div>
          </div>

          {/* Kompositions-Leiste: Brutto zerfällt sichtbar in Netto + Abzüge */}
          <div
            className="mt-4 flex h-2.5 w-full gap-px overflow-hidden rounded-full bg-surface-2"
            role="img"
            aria-label={`Zusammensetzung: ${Math.round(nettoPct)} % Netto, Rest Abzüge`}
          >
            {segmente.map((seg, i) => (
              <div
                key={seg.key}
                className="animate-grow-x h-full"
                style={{
                  width: `${seg.anteil}%`,
                  minWidth: "4px",
                  background: seg.farbe,
                  animationDelay: `${i * 90}ms`,
                }}
              />
            ))}
          </div>

          {/* Aufschlüsselung: Summe X → Abzüge (Dots = Leisten-Farben) */}
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <dt className="flex items-center gap-2 text-muted-foreground">
                <span
                  className="h-2 w-2 shrink-0 rounded-full bg-accent-gradient"
                  aria-hidden
                />
                Summe X (nach Factoring)
              </dt>
              <dd className="shrink-0 font-medium tabular-nums">
                {formatEURCents(s.brutto)}
              </dd>
            </div>
            {ABZUEGE.map((a) => {
              const wert = s[a.key];
              const anteil = pct(wert, s.brutto);
              return (
                <div
                  key={a.key}
                  className="flex items-baseline justify-between gap-3"
                >
                  <dt className="flex items-center gap-2 text-muted-foreground">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{
                        background: a.farbe,
                        opacity: wert > 0 ? 1 : 0.3,
                      }}
                      aria-hidden
                    />
                    {a.label}
                  </dt>
                  <dd className="shrink-0 tabular-nums text-muted-foreground">
                    {wert > 0 ? "− " : ""}
                    {formatEURCents(wert)}
                    {anteil >= 1 && (
                      <span className="ml-1.5 text-xs text-muted-foreground/70">
                        {Math.round(anteil)} %
                      </span>
                    )}
                  </dd>
                </div>
              );
            })}
          </dl>
        </>
      )}
    </div>
  );
}

/**
 * Summen-Skala (6.2, NUR GF): von der Bruttoprovision der gewonnenen Deals
 * Schritt für Schritt zu dem, was bei Estera liquide bleibt — je Bereich
 * getrennt und als Gesamtsumme. Redesign Schleife 3 (Punkt 4): Netto als
 * Hero-Zahl, Kompositions-Leiste statt reiner Tabelle. Berater sehen
 * diesen Block nie.
 */
export function SummenSkalaBlock({ a }: { a: AnalyticsData }) {
  if (!a.isGf) return null;
  return (
    <section>
      <div className="mb-3">
        <h2 className="text-base font-semibold">Estera-Umsatz (Summen-Skala)</h2>
        <p className="text-xs text-muted-foreground">
          Realisierte Provision der gewonnenen Deals · Einbehalt wird nach 12
          Monaten liquide · nur Geschäftsführung.
        </p>
      </div>
      <div className="grid items-start gap-4 lg:grid-cols-3">
        <SkalaKarte
          titel={bereichLabel("immobilien")}
          s={summenSkala(a, "immobilien")}
        />
        <SkalaKarte titel={bereichLabel("vv")} s={summenSkala(a, "vv")} />
        <SkalaKarte titel="Gesamt" s={summenSkala(a)} hervorgehoben />
      </div>
    </section>
  );
}
