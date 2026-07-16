import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import {
  computeProvision,
  einbehaltFaelligAm,
  zahlartOf,
} from "@/lib/provision";
import { formatDate } from "@/lib/format";
import { loadDealRows, type DealRow } from "../lists-data";
import { DealsTable, type DealDisplay } from "../deals-table";

const META: Record<string, { title: string; subtitle: string; datumLabel: string }> = {
  notartermine: { title: "Notartermine diese Woche", subtitle: "Immobilien-Deals mit Notartermin in dieser Woche", datumLabel: "Notartermin" },
  termine7: { title: "Nächste Termine (7 Tage)", subtitle: "Deals mit nächstem Termin in den kommenden 7 Tagen", datumLabel: "Nächster Termin" },
  finanzierung: { title: "Deals in Finanzierung", subtitle: "Immobilien-Deals in der Phase „Finanzierung in Prüfung“", datumLabel: "Nächster Termin" },
  verkauft: { title: "Verkaufte Deals", subtitle: "Gewonnene Abschlüsse (Reporting)", datumLabel: "Abgeschlossen" },
  offen: { title: "Offene Deals", subtitle: "Alle Deals, die weder gewonnen noch verloren sind", datumLabel: "Nächster Termin" },
  "mit-einbehalt": { title: "Deals mit Einbehalt", subtitle: "VV-Deals mit & ohne Factoring (85 % sofort, 15 % Einbehalt nach 12 Mon.)", datumLabel: "Nächster Termin" },
  "ohne-einbehalt": { title: "Deals ohne Einbehalt", subtitle: "Ratierliche VV-Deals (Auszahlung über 60 Monatsraten)", datumLabel: "Nächster Termin" },
  "einbehalt-offen": { title: "Offener Einbehalt je Kunde", subtitle: "Einbehaltene 15 % (alle nicht-ratierlichen VV-Deals) und deren Fälligkeit", datumLabel: "" },
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfWeek(d: Date) {
  const x = startOfDay(d);
  const shift = (x.getDay() + 6) % 7; // Montag = 0
  x.setDate(x.getDate() - shift);
  return x;
}
function inRange(iso: string | null, from: Date, toExcl: Date) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  return t >= from.getTime() && t < toExcl.getTime();
}
function monatsText(faellig: Date, now: Date): string {
  const months = Math.round(
    (faellig.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30),
  );
  if (months <= 0) return "diesen Monat";
  return `in ${months} ${months === 1 ? "Monat" : "Monaten"}`;
}
const betragOf = (d: DealRow) =>
  d.bereich === "immobilien" ? d.kaufpreis : d.bws;

export default async function DealListenPage({
  searchParams,
}: {
  searchParams: Promise<{ preset?: string; from?: string }>;
}) {
  const { preset = "verkauft", from } = await searchParams;
  // Zurück zur Herkunft (Feedback SJ): kommt man vom Dashboard, führt „Zurück"
  // auch dorthin — nicht immer auf die Übersichten-Seite.
  const backHref = from && from.startsWith("/") ? from : "/listen";
  const meta = META[preset] ?? META.verkauft;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("rolle")
    .eq("id", user.id)
    .single();
  const isGf = me?.rolle === "geschaeftsfuehrung";

  const rows = await loadDealRows();
  const now = new Date();
  const variant = preset === "einbehalt-offen" ? "einbehalt" : "standard";

  const std = (d: DealRow, datum: string | null): DealDisplay => ({
    id: d.id,
    dealname: d.dealname,
    bereich: d.bereich,
    phase: d.stageName,
    stagePos: d.stagePos,
    betrag: betragOf(d),
    berater: d.berater,
    datum,
  });

  let list: DealDisplay[] = [];

  if (preset === "notartermine") {
    const from = startOfWeek(now);
    const to = new Date(from);
    to.setDate(from.getDate() + 7);
    list = rows
      .filter((d) => d.bereich === "immobilien" && inRange(d.notartermin, from, to))
      .sort((a, b) => (a.notartermin ?? "").localeCompare(b.notartermin ?? ""))
      .map((d) => std(d, d.notartermin));
  } else if (preset === "termine7") {
    const from = startOfDay(now);
    const to = new Date(from);
    to.setDate(from.getDate() + 8); // heute .. +7 Tage inkl.
    list = rows
      .filter((d) => inRange(d.naechsterTermin, from, to))
      .sort((a, b) =>
        (a.naechsterTermin ?? "").localeCompare(b.naechsterTermin ?? ""),
      )
      .map((d) => std(d, d.naechsterTermin));
  } else if (preset === "finanzierung") {
    list = rows
      .filter(
        (d) => d.bereich === "immobilien" && d.stageName === "Finanzierung in Prüfung",
      )
      .map((d) => std(d, d.naechsterTermin));
  } else if (preset === "verkauft") {
    list = rows
      .filter((d) => d.isWon)
      .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""))
      .map((d) => std(d, d.closedAt));
  } else if (preset === "offen") {
    list = rows
      .filter((d) => !d.isWon && !d.isLost)
      .sort((a, b) => a.stagePos - b.stagePos)
      .map((d) => std(d, d.naechsterTermin));
  } else if (preset === "mit-einbehalt") {
    // Einbehalt gilt bei Factoring UND ohne Factoring (F1.4) —
    // nur ratierlich hat keinen.
    list = rows
      .filter((d) => d.bereich === "vv" && zahlartOf(d) !== "ratierlich")
      .map((d) => std(d, d.naechsterTermin));
  } else if (preset === "ohne-einbehalt") {
    list = rows
      .filter((d) => d.bereich === "vv" && zahlartOf(d) === "ratierlich")
      .map((d) => std(d, d.naechsterTermin));
  } else if (preset === "einbehalt-offen") {
    list = rows
      .filter((d) => d.bereich === "vv" && zahlartOf(d) !== "ratierlich")
      .map((d) => {
        const prov = computeProvision({
          bws: d.bws,
          zahlart: zahlartOf(d),
          vertrieblerStufe: d.vertrieblerStufe,
          tippgeberSatz: d.tippgeber_satz,
        });
        const basis = d.closedAt ?? d.createdAt;
        const faelligISO = einbehaltFaelligAm(basis);
        const faellig = faelligISO ? new Date(faelligISO) : null;
        const offen = faellig ? faellig.getTime() > now.getTime() : true;
        return {
          id: d.id,
          dealname: d.dealname,
          bereich: d.bereich,
          phase: d.stageName,
          stagePos: d.stagePos,
          betrag: d.bws,
          berater: d.berater,
          datum: null,
          einbehaltBetrag: prov.einbehaltBetrag,
          faelligText: faellig
            ? offen
              ? monatsText(faellig, now)
              : formatDate(faelligISO)
            : "—",
          offen,
        } satisfies DealDisplay;
      })
      .sort((a, b) => Number(b.offen) - Number(a.offen));
  }

  return (
    <>
      <Topbar title={meta.title} subtitle={meta.subtitle} backHref={backHref} />
      <div className="px-6 py-6">
        <DealsTable
          rows={list}
          datumLabel={meta.datumLabel}
          variant={variant}
          isGf={isGf}
          sumLabel={preset === "offen" ? "Pipeline gesamt" : "Summe"}
        />
      </div>
    </>
  );
}
