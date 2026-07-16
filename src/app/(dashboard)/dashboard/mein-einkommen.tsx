"use client";

import { useState } from "react";
import {
  CalendarClock,
  ChevronDown,
  Coins,
  Hourglass,
  Repeat,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { formatEURCents, formatEUR, formatDate } from "@/lib/format";
import { InfoHint } from "@/components/ui/info-hint";
import { KARRIERE_RAENGE } from "@/config/karriere";
import type {
  EinbehaltPosten,
  RatierlichPosten,
  OverheadPosten,
  SofortPosten,
} from "@/lib/gehalt";

export type KarriereProps = {
  aktuellStufe: number;
  aktuellRang: string;
  aktuellAnteil: number;
  naechsterRang: string | null;
  naechsterAnteil: number | null;
  restBws: number;
  fortschrittPct: number;
  restTage: number | null;
  fensterAbgelaufen: boolean;
  bwsImFenster: number;
};

export type GehaltProps = {
  sofort: { monat: number; quartal: number; jahr: number; gesamt: number };
  sofortPosten: SofortPosten[];
  einbehaltSumme: number;
  einbehaltKalender: EinbehaltPosten[];
  ratierlichMonatlich: number;
  ratierlichRestsumme: number;
  ratierlichPosten: RatierlichPosten[];
  overheadSumme: number;
  overheadPosten: OverheadPosten[];
};

const PERIODEN = [
  { k: "monat", label: "Monat" },
  { k: "quartal", label: "Quartal" },
  { k: "jahr", label: "Jahr" },
  { k: "gesamt", label: "Gesamt" },
] as const;

/**
 * „Mein Einkommen" (7.3 + 7.4) — Berater-Ansicht: Karriere-Fortschritt (reine
 * Motivationsanzeige, kein Auto-Aufstieg) + die vier Gehalts-Bausteine.
 * Leere Bausteine (kein Einbehalt/ratierlich/Overhead) werden ausgeblendet.
 */
export function MeinEinkommen({
  karriere,
  gehalt,
  zeigeKarriere,
}: {
  karriere: KarriereProps;
  gehalt: GehaltProps;
  zeigeKarriere: boolean;
}) {
  const [periode, setPeriode] = useState<(typeof PERIODEN)[number]["k"]>("monat");
  const sofortWert = gehalt.sofort[periode];
  // Posten passend zur gewählten Periode — „Gesamt" zeigt alle.
  const sofortPostenPeriode = gehalt.sofortPosten.filter((s) =>
    periode === "gesamt" ? true : s.periode[periode],
  );

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Mein Einkommen</h2>
        <p className="text-xs text-muted-foreground">
          Reales Einkommen statt Papier-Provision · Auszahlungen & Karriere.
        </p>
      </div>

      {/* Karriereleiter (7.3) — nur VV */}
      {zeigeKarriere && <KarriereBalken k={karriere} />}

      {/* Gehalts-Bausteine (7.4) */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sofort ausgezahlt — mit Perioden-Umschalter + Aufschlüsselung */}
        <BausteinKarte
          icon={Coins}
          farbe="var(--success)"
          titel="Sofort ausgezahlt"
          betrag={sofortWert}
          leer={sofortPostenPeriode.length === 0}
          leerText={`Keine realisierte Auszahlung · ${PERIODEN.find((p) => p.k === periode)?.label}.`}
          anzahl={sofortPostenPeriode.length}
          info="Was bereits bei dir angekommen ist: bei Factoring-Deals die 85 % (die restlichen 15 % stehen im Einbehalt), sonst dein voller Anteil. Immobilien zählen ab Notartermin, VV ab Policierung. Ratierliche Deals stehen separat unter „Passiv“."
          aktion={
            <div className="flex gap-0.5 rounded-md bg-surface-2 p-0.5">
              {PERIODEN.map((p) => (
                <button
                  key={p.k}
                  type="button"
                  onClick={() => setPeriode(p.k)}
                  className={
                    periode === p.k
                      ? "rounded px-2 py-1 text-xs font-medium bg-background text-foreground shadow-sm"
                      : "rounded px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                  }
                >
                  {p.label}
                </button>
              ))}
            </div>
          }
        >
          <p className="mt-1 text-xs text-muted-foreground">
            Realisierte Auszahlung ·{" "}
            {PERIODEN.find((p) => p.k === periode)?.label}
          </p>
          <ul className="mt-3 space-y-1.5">
            {sofortPostenPeriode.map((s) => (
              <li
                key={s.dealId}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {s.dealname}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {formatDate(s.amISO)}
                </span>
                <span className="shrink-0 tabular-nums font-medium">
                  {formatEURCents(s.betrag)}
                </span>
              </li>
            ))}
          </ul>
        </BausteinKarte>

        {/* Einbehalt gesammelt + Kalender */}
        <BausteinKarte
          icon={Hourglass}
          farbe="var(--warning)"
          titel="Einbehalt gesammelt"
          betrag={gehalt.einbehaltSumme}
          leer={gehalt.einbehaltKalender.length === 0}
          leerText="Kein offener Einbehalt (nur ratierliche Deals haben keinen)."
          anzahl={gehalt.einbehaltKalender.length}
          info="Bei Factoring-Deals werden 15 % deiner Provision einbehalten und erst 12 Monate nach Abschluss ausgezahlt (Storno-Sicherheit). Hier stehen alle noch offenen Einbehalte mit ihrem Auszahlungsdatum — das Geld ist dir sicher, nur noch nicht geflossen."
        >
          <ul className="mt-3 space-y-1.5">
            {gehalt.einbehaltKalender.map((e) => (
              <li
                key={e.dealId}
                className="flex items-center justify-between gap-2 text-xs"
              >
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {e.dealname}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {e.faelligISO ? formatDate(e.faelligISO) : "—"}
                </span>
                <span className="shrink-0 tabular-nums font-medium">
                  {formatEURCents(e.betrag)}
                </span>
              </li>
            ))}
          </ul>
        </BausteinKarte>

        {/* Passiv (ratierlich) */}
        {gehalt.ratierlichPosten.length > 0 && (
          <BausteinKarte
            icon={Repeat}
            farbe="var(--info)"
            titel="Passiv (ratierlich)"
            betrag={gehalt.ratierlichMonatlich}
            betragSuffix="/ Monat"
            leer={false}
            anzahl={gehalt.ratierlichPosten.length}
            info={`Ratierliche Deals werden nicht auf einmal, sondern über 60 Monate ausgezahlt. Hier siehst du die Summe deiner laufenden Monatsraten. Restsumme insgesamt: ${formatEURCents(gehalt.ratierlichRestsumme)}.`}
          >
            <p className="mt-1 text-xs text-muted-foreground">
              Restsumme {formatEURCents(gehalt.ratierlichRestsumme)}
            </p>
            <ul className="mt-3 space-y-1.5">
              {gehalt.ratierlichPosten.map((r) => (
                <li
                  key={r.dealId}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {r.dealname}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {r.restMonate} Mon.
                  </span>
                  <span className="shrink-0 tabular-nums font-medium">
                    {formatEURCents(r.monatsrate)}
                  </span>
                </li>
              ))}
            </ul>
          </BausteinKarte>
        )}

        {/* Overhead aus Partnern (nur wenn Downline vorhanden) */}
        {gehalt.overheadPosten.length > 0 && (
          <BausteinKarte
            icon={Users}
            farbe="var(--gold-contrast)"
            titel="Overhead aus Partnern"
            betrag={gehalt.overheadSumme}
            leer={false}
            anzahl={gehalt.overheadPosten.length}
            info="Differenzmodell: Schließt jemand aus deiner Downline ab, bekommst du die Differenz zwischen deiner Anbindung und der deines direkten Partners in diesem Ast — bei VV über die Stufe, bei Immobilien über den Immo-Anteil. Gilt über alle Ebenen, also auch für Abschlüsse unter deinen Partnern."
          >
            <ul className="mt-3 space-y-1.5">
              {gehalt.overheadPosten.map((o) => (
                <li
                  key={o.partnerId}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="min-w-0 flex-1 truncate text-muted-foreground">
                    {o.partnerName}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {o.deals} Deals
                  </span>
                  <span className="shrink-0 tabular-nums font-medium">
                    {formatEURCents(o.betrag)}
                  </span>
                </li>
              ))}
            </ul>
          </BausteinKarte>
        )}
      </div>
    </section>
  );
}

function BausteinKarte({
  icon: Icon,
  farbe,
  titel,
  betrag,
  betragSuffix,
  leer,
  leerText,
  info,
  anzahl,
  aktion,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  farbe: string;
  titel: string;
  betrag: number;
  betragSuffix?: string;
  leer: boolean;
  leerText?: string;
  /** Kurze Erklärung, wie die Zahl entsteht (?-Tooltip, Feedback SJ). */
  info?: string;
  /** Anzahl Posten — steuert den Aufklapp-Hinweis („3 Posten"). */
  anzahl?: number;
  /** Optionale Kopfzeilen-Aktion (z. B. Perioden-Umschalter). */
  aktion?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const [offen, setOffen] = useState(false);
  const klappbar = !leer && !!children && (anzahl ?? 0) > 0;

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className="grid h-8 w-8 place-items-center rounded-md"
            style={{
              background: `color-mix(in srgb, ${farbe} 14%, transparent)`,
              color: farbe,
            }}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            {titel}
            {info && <InfoHint text={info} align="right" />}
          </span>
        </div>
        {aktion}
      </div>

      {/* Zahl klickbar: zeigt, woraus sie sich zusammensetzt (Feedback SJ) */}
      <button
        type="button"
        onClick={() => klappbar && setOffen((v) => !v)}
        disabled={!klappbar}
        aria-expanded={offen}
        className={
          klappbar
            ? "-mx-1 flex w-[calc(100%+0.5rem)] items-center gap-2 rounded-md px-1 py-0.5 text-left transition-colors hover:bg-surface-2"
            : "flex w-full items-center gap-2 text-left"
        }
      >
        <span className="text-3xl font-bold tabular-nums">
          {formatEURCents(betrag)}
          {betragSuffix && (
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              {betragSuffix}
            </span>
          )}
        </span>
        {klappbar && (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              offen ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {klappbar && !offen && (
        <p className="mt-1 text-xs text-muted-foreground">
          {anzahl} {anzahl === 1 ? "Posten" : "Posten"} · anklicken zum
          Aufschlüsseln
        </p>
      )}

      {leer ? (
        <p className="mt-2 text-xs text-muted-foreground">{leerText}</p>
      ) : (
        offen && children
      )}
    </div>
  );
}

/** Karriere-Ladebalken (7.3): Rang, Fortschritt zum nächsten, Fenster. */
function KarriereBalken({ k }: { k: KarriereProps }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gold/10 text-gold-contrast">
            <Trophy className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{k.aktuellRang}</span>
              <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium tabular-nums text-muted-foreground">
                {k.aktuellAnteil}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Stufe {k.aktuellStufe} von {KARRIERE_RAENGE.length}
            </p>
          </div>
        </div>
        {k.restTage != null && (
          <span
            className={
              "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium " +
              (k.fensterAbgelaufen
                ? "bg-danger/10 text-danger"
                : "bg-secondary text-muted-foreground")
            }
          >
            <CalendarClock className="h-3.5 w-3.5" />
            {k.fensterAbgelaufen
              ? "Fenster abgelaufen"
              : `Fenster: noch ${k.restTage} Tage`}
          </span>
        )}
      </div>

      {k.naechsterRang ? (
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Noch{" "}
              <span className="font-semibold text-foreground">
                {formatEUR(k.restBws)}
              </span>{" "}
              BWS bis {k.naechsterRang} ({k.naechsterAnteil}%)
            </span>
            <span className="tabular-nums text-muted-foreground">
              {Math.round(k.fortschrittPct)}%
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent-gradient transition-all"
              style={{ width: `${k.fortschrittPct}%` }}
            />
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3" />
            {formatEUR(k.bwsImFenster)} BWS im aktuellen Fenster · der Aufstieg
            wird von der Geschäftsführung bestätigt.
          </p>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Höchste Stufe erreicht — Partner (60 %). 🎉
        </p>
      )}
    </div>
  );
}
