"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarClock,
  Flame,
  Lock,
  Pencil,
  Target,
  TrendingUp,
} from "lucide-react";
import { bereichLabel } from "@/config/enums";
import { formatEUR } from "@/lib/format";
import { Pill } from "@/components/ui/pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { setEigenesMonatsziel } from "@/app/(dashboard)/actions";
import type { SpartenZiel, ZielDaten } from "@/lib/ziele";

/* -------------------------------------------------------------------------
   Ziel-Box (Schleife 3, Berater-Punkt 2): Der Berater loggt sich ein und
   sieht SOFORT, wo er steht — Monatsziel je Sparte (nie zusammengefasst),
   animierter Fortschritt (weit weg = rot, näher = gelb, nah/erreicht = grün),
   Rest-Tage und Streaks als Dranbleiben-Anreiz. Beträge = eigene Provision.
   ------------------------------------------------------------------------- */

/** Sanfter Count-up (ease-out), respektiert prefers-reduced-motion. */
function useCountUp(target: number, ms = 900): number {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setV(target);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

/** Ampel-Logik (Wunsch: weit weg rot, näher gelb, ganz nah/erreicht grün). */
function statusFuer(pctZiel: number): {
  token: string;
  label: string;
} {
  if (pctZiel >= 100) return { token: "var(--success)", label: "Ziel erreicht" };
  if (pctZiel >= 80) return { token: "var(--success)", label: "Fast am Ziel" };
  if (pctZiel >= 40) return { token: "var(--warning)", label: "Auf dem Weg" };
  return { token: "var(--danger)", label: "Jetzt Gas geben" };
}

function ZielKarte({
  sparte,
  monatsName,
  restTage,
  monatsAnteil,
}: {
  sparte: SpartenZiel;
  monatsName: string;
  restTage: number;
  monatsAnteil: number;
}) {
  const ziel = sparte.ziel ?? 0;
  const pctZiel = ziel > 0 ? Math.min(150, (sparte.erreicht / ziel) * 100) : 0;
  const status = statusFuer(pctZiel);
  const animiert = useCountUp(sparte.erreicht);

  // Balken füllt nach dem Mount animiert auf (CSS-Transition auf width).
  const [breite, setBreite] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setBreite(Math.min(100, pctZiel)));
    return () => cancelAnimationFrame(id);
  }, [pctZiel]);

  // Pace: liegt der Berater vor/hinter dem Zeitverlauf des Monats?
  const soll = ziel * monatsAnteil;
  const aufKurs = sparte.erreicht >= soll;
  const rueckstand = Math.max(0, soll - sparte.erreicht);

  if (sparte.ziel == null) {
    return (
      <div className="rounded-xl border border-border bg-surface p-6">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4 text-muted-foreground" aria-hidden />
          Monatsziel {bereichLabel(sparte.bereich)}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Noch kein Monatsziel gesetzt — leg über „Ziel bearbeiten&ldquo; dein
          persönliches Ziel fest, dann siehst du hier deinen Fortschritt.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-xl border border-border border-t-2 bg-surface p-6"
      style={{ borderTopColor: status.token }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Target className="h-4 w-4 text-muted-foreground" aria-hidden />
          Monatsziel {bereichLabel(sparte.bereich)}
          <span className="font-normal text-muted-foreground">
            · {monatsName}
          </span>
        </div>
        <span
          className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium"
          style={{
            color: status.token,
            background: `color-mix(in srgb, ${status.token} 14%, transparent)`,
          }}
        >
          {status.label}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-3xl font-bold tracking-tight tabular-nums">
          {formatEUR(Math.round(animiert))}
        </span>
        <span className="text-sm text-muted-foreground">
          von {formatEUR(ziel)} · {Math.round(pctZiel)} %
        </span>
      </div>

      <div
        className="mt-4 h-3 w-full overflow-hidden rounded-full bg-surface-2"
        role="progressbar"
        aria-valuenow={Math.round(Math.min(100, pctZiel))}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Zielfortschritt ${bereichLabel(sparte.bereich)}`}
      >
        <div
          className="h-full rounded-full transition-[width] duration-1000 ease-out"
          style={{
            width: `${breite}%`,
            background:
              pctZiel >= 100
                ? "var(--accent-gradient)"
                : status.token,
          }}
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span
          className="inline-flex items-center gap-1.5"
          style={{ color: aufKurs ? "var(--success)" : "var(--warning)" }}
        >
          <TrendingUp className="h-3.5 w-3.5" aria-hidden />
          {aufKurs
            ? "Auf Kurs für diesen Monat"
            : `${formatEUR(Math.round(rueckstand))} hinter dem Zeitplan`}
        </span>
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
          {restTage} {restTage === 1 ? "Tag" : "Tage"} übrig
        </span>
      </div>

      {sparte.streakMonate > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gold-contrast">
            <Flame className="h-3.5 w-3.5" aria-hidden />
            {sparte.streakMonate}{" "}
            {sparte.streakMonate === 1 ? "Monat" : "Monate"} Ziel erreicht in
            Folge
          </span>
        </div>
      )}
    </div>
  );
}

/** Betrag-String -> Zahl|null (leer = kein Ziel), undefined = ungültig. */
function parseZiel(s: string): number | null | undefined {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  if (Number.isNaN(n) || n < 0) return undefined;
  return n;
}

/** Inline-Formular: Berater setzt seine Monatsziele selbst (15.2). */
function ZielEditor({
  daten,
  onClose,
}: {
  daten: ZielDaten;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const immoSparte = daten.sparten.find((s) => s.bereich === "immobilien");
  const vvSparte = daten.sparten.find((s) => s.bereich === "vv");
  const [immo, setImmo] = useState(
    immoSparte?.ziel != null ? String(immoSparte.ziel) : "",
  );
  const [vv, setVv] = useState(vvSparte?.ziel != null ? String(vvSparte.ziel) : "");

  function save() {
    const zi = immoSparte ? parseZiel(immo) : null;
    const zv = vvSparte ? parseZiel(vv) : null;
    if (zi === undefined || zv === undefined) {
      toast.error("Ziel muss eine positive Zahl sein (oder leer).");
      return;
    }
    start(async () => {
      const res = await setEigenesMonatsziel(zi ?? null, zv ?? null);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      toast.success("Monatsziel gespeichert");
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <p className="mb-3 text-sm text-muted-foreground">
        Setze dein persönliches Monatsziel (eigene Provision). Leer lassen = kein
        Ziel.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {immoSparte && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ziel-immo">Ziel Immobilien (€)</Label>
            <Input
              id="ziel-immo"
              inputMode="decimal"
              placeholder="z. B. 10000"
              value={immo}
              onChange={(e) => setImmo(e.target.value)}
              className="tabular-nums"
            />
          </div>
        )}
        {vvSparte && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ziel-vv">Ziel Vermögensverwaltung (€)</Label>
            <Input
              id="ziel-vv"
              inputMode="decimal"
              placeholder="z. B. 5000"
              value={vv}
              onChange={(e) => setVv(e.target.value)}
              className="tabular-nums"
            />
          </div>
        )}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={onClose} disabled={pending}>
          Abbrechen
        </Button>
        <Button size="sm" onClick={save} disabled={pending}>
          {pending ? "Speichern …" : "Ziel speichern"}
        </Button>
      </div>
    </div>
  );
}

export function ZielBlock({ daten }: { daten: ZielDaten }) {
  const [edit, setEdit] = useState(false);
  return (
    <section aria-label="Monatsziele">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Deine Monatsziele</h2>
          <p className="text-xs text-muted-foreground">
            Eigene Provision im {daten.monatsName} —{" "}
            {daten.gesperrt
              ? "von der Geschäftsführung festgelegt."
              : "du setzt dein Ziel selbst."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {daten.aktivTage >= 2 && (
            <Pill tone="accent">
              <Flame className="mr-1 h-3 w-3" aria-hidden />
              {daten.aktivTage} Werktage aktiv in Folge
            </Pill>
          )}
          {daten.gesperrt ? (
            <Pill tone="muted">
              <Lock className="mr-1 h-3 w-3" aria-hidden />
              gesperrt
            </Pill>
          ) : (
            !edit && (
              <Button variant="outline" size="sm" onClick={() => setEdit(true)}>
                <Pencil className="mr-1 h-3.5 w-3.5" />
                Ziel bearbeiten
              </Button>
            )
          )}
        </div>
      </div>

      {edit && !daten.gesperrt ? (
        <ZielEditor daten={daten} onClose={() => setEdit(false)} />
      ) : (
        <div
          className={
            daten.sparten.length > 1
              ? "grid items-start gap-4 lg:grid-cols-2"
              : "grid gap-4"
          }
        >
          {daten.sparten.map((s) => (
            <ZielKarte
              key={s.bereich}
              sparte={s}
              monatsName={daten.monatsName}
              restTage={daten.restTage}
              monatsAnteil={daten.monatsAnteil}
            />
          ))}
        </div>
      )}
    </section>
  );
}
