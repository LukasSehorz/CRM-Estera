import { Building2, HandCoins, Hourglass, Scale, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/charts/kpi-card";
import { formatDate, formatEUR } from "@/lib/format";
import { einbehaltFaelligAm } from "@/lib/provision";
import {
  betragOf,
  isOpen,
  isWon,
  type AnalyticsData,
  type BereichScope,
} from "@/lib/analytics";

type Werte = {
  volumen: number;
  erwartet: number;
  gewichtet: number;
  einbehalt: number;
  naechsteFaelligkeit: string | null;
};

function werteFuer(a: AnalyticsData, bereich: "immobilien" | "vv"): Werte {
  const offene = a.deals.filter(
    (d) => d.bereich === bereich && isOpen(d, a.sMap),
  );
  let volumen = 0;
  let erwartet = 0;
  let gewichtet = 0;
  for (const d of offene) {
    volumen += betragOf(d);
    const u = a.umsatzOf(d);
    erwartet += u;
    gewichtet += (u * (a.sMap.get(d.stage_id)?.wahrscheinlichkeit ?? 0)) / 100;
  }

  // Offene Einbehalte (nur VV ohne Factoring): Fälligkeit = Abschluss + 12 Monate
  let einbehalt = 0;
  let naechste: string | null = null;
  if (bereich === "vv") {
    const jetzt = new Date().toISOString();
    for (const d of a.deals.filter(
      (x) => x.bereich === "vv" && isWon(x, a.sMap),
    )) {
      const faellig = einbehaltFaelligAm(d.closed_at ?? d.created_at);
      if (!faellig || faellig <= jetzt) continue;
      const betrag = a.einbehaltOf(d);
      if (betrag <= 0) continue;
      einbehalt += betrag;
      if (!naechste || faellig < naechste) naechste = faellig;
    }
  }
  return { volumen, erwartet, gewichtet, einbehalt, naechsteFaelligkeit: naechste };
}

/**
 * Erwartete Provision prominent (Schleife 2, 4.2): Volumen, erwartete und
 * gewichtete Provision der offenen Pipeline + offene Einbehalte — je Bereich
 * getrennt, bei „Gesamt" mit kombinierter Summe und Aufschlüsselung.
 * Rollenbewusst: der Berater sieht ausschließlich SEINE Provision (2.2).
 */
export function ProvisionBlock({
  a,
  scope,
}: {
  a: AnalyticsData;
  scope: BereichScope;
}) {
  const bereiche =
    scope === "gesamt" ? a.meineBereiche : ([scope] as ("immobilien" | "vv")[]);
  const einzel = bereiche.map((b) => ({ bereich: b, w: werteFuer(a, b) }));
  const summe = einzel.reduce<Werte>(
    (acc, { w }) => ({
      volumen: acc.volumen + w.volumen,
      erwartet: acc.erwartet + w.erwartet,
      gewichtet: acc.gewichtet + w.gewichtet,
      einbehalt: acc.einbehalt + w.einbehalt,
      naechsteFaelligkeit:
        acc.naechsteFaelligkeit == null ||
        (w.naechsteFaelligkeit != null &&
          w.naechsteFaelligkeit < acc.naechsteFaelligkeit)
          ? w.naechsteFaelligkeit
          : acc.naechsteFaelligkeit,
    }),
    { volumen: 0, erwartet: 0, gewichtet: 0, einbehalt: 0, naechsteFaelligkeit: null },
  );

  // Bei „Gesamt": Aufschlüsselung je Bereich als Zusatzzeile (Vorgabe 4.2)
  const sub = (pick: (w: Werte) => number): string | undefined =>
    einzel.length > 1
      ? einzel
          .map(
            ({ bereich, w }) =>
              `${bereich === "immobilien" ? "Immo" : "VV"} ${formatEUR(pick(w))}`,
          )
          .join(" · ")
      : undefined;

  const provisionsLabel = a.isGf ? "Provision (Estera)" : "Meine Provision";

  // Einbehalte sind ein reines VV-Thema. In der Immobilien-Ansicht ist die
  // Kachel sinnlos (immer „—") → durch Ø Deal-Größe der offenen Immo-Pipeline
  // ersetzen (Wunsch 7). Bei „Gesamt"/VV bleibt der Einbehalt.
  const zeigtVv = bereiche.includes("vv");
  const offeneImmo = a.deals.filter(
    (d) => d.bereich === "immobilien" && isOpen(d, a.sMap),
  ).length;
  const avgDealGroesse = offeneImmo > 0 ? summe.volumen / offeneImmo : 0;

  return (
    <section>
      <div className="mb-3">
        <h2 className="text-base font-semibold">Blick nach vorn</h2>
        <p className="text-xs text-muted-foreground">
          Offene Pipeline: was {a.isGf ? "Estera" : "du"} beim Abschluss
          verdient — voll und nach Phasen-Wahrscheinlichkeit gewichtet.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Pipeline-Volumen (offen)"
          value={formatEUR(summe.volumen)}
          sub={sub((w) => w.volumen)}
          icon={TrendingUp}
          tone="info"
        />
        <KpiCard
          label={`Erwartete ${provisionsLabel}`}
          value={formatEUR(summe.erwartet)}
          sub={sub((w) => w.erwartet)}
          icon={HandCoins}
          tone="accent"
        />
        <KpiCard
          label="Gewichtet (realistisch)"
          value={formatEUR(summe.gewichtet)}
          sub={sub((w) => w.gewichtet)}
          icon={Scale}
          tone="success"
        />
        {zeigtVv ? (
          <KpiCard
            label="Offene Einbehalte (VV)"
            value={summe.einbehalt > 0 ? formatEUR(summe.einbehalt) : "—"}
            sub={
              summe.naechsteFaelligkeit
                ? `nächste Auszahlung ${formatDate(summe.naechsteFaelligkeit)}`
                : undefined
            }
            href="/listen/deals?preset=einbehalt-offen"
            icon={Hourglass}
            tone="warning"
          />
        ) : (
          <KpiCard
            label="Ø Deal-Größe (offen)"
            value={avgDealGroesse > 0 ? formatEUR(avgDealGroesse) : "—"}
            sub={offeneImmo > 0 ? `${offeneImmo} offene Deals` : undefined}
            icon={Building2}
            tone="warning"
          />
        )}
      </div>
    </section>
  );
}
