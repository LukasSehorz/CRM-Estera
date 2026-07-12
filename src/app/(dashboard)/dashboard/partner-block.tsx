import { Handshake, Network } from "lucide-react";
import { formatEUR, formatEURCents } from "@/lib/format";
import type { AnalyticsData } from "@/lib/analytics";
import { meinePartner, meineTippgeber } from "@/lib/partner";

/**
 * „Meine Partner" (8.1) + „Meine Tippgeber" (8.3) — die moderate Berater-
 * Variante des Partnersystems. Wird nur gerendert, wenn es tatsächlich eine
 * Downline bzw. Tippgeber gibt (8.1: sonst ausblenden).
 */
export function PartnerBlock({
  a,
  beraterId,
}: {
  a: AnalyticsData;
  beraterId: string;
}) {
  const partner = meinePartner(a, beraterId);
  const tippgeber = meineTippgeber(a, beraterId);
  if (partner.length === 0 && tippgeber.length === 0) return null;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Partner & Tippgeber</h2>
        <p className="text-xs text-muted-foreground">
          Deine Downline und Tippgeber — inkl. Overhead und weitergegebener
          Anteile.
        </p>
      </div>

      {partner.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-gold/10 text-gold-contrast">
              <Network className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold">Meine Partner</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Partner</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Abschlüsse</th>
                  <th className="px-4 py-2.5 font-medium">Pipeline</th>
                  <th className="px-4 py-2.5 font-medium">Provision Partner</th>
                  <th className="px-4 py-2.5 font-medium">Mein Overhead</th>
                </tr>
              </thead>
              <tbody>
                {partner.map((p) => (
                  <tr key={p.partnerId} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {p.name}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          p.aktiv
                            ? "inline-flex items-center gap-1 text-xs text-success"
                            : "inline-flex items-center gap-1 text-xs text-muted-foreground"
                        }
                      >
                        <span
                          className={
                            "h-1.5 w-1.5 rounded-full " +
                            (p.aktiv ? "bg-success" : "bg-muted-foreground/40")
                          }
                        />
                        {p.aktiv ? "aktiv" : "inaktiv"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{p.abschluesse}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                      {formatEUR(p.pipelineVolumen)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                      {formatEUR(p.provision)}
                    </td>
                    <td className="px-4 py-2.5 font-semibold tabular-nums text-gold-contrast">
                      {formatEURCents(p.overhead)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tippgeber.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-info/10 text-info">
              <Handshake className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold">Meine Tippgeber</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 font-medium">Tippgeber</th>
                  <th className="px-4 py-2.5 font-medium">Leads</th>
                  <th className="px-4 py-2.5 font-medium">gewonnen</th>
                  <th className="px-4 py-2.5 font-medium">Meine Provision</th>
                  <th className="px-4 py-2.5 font-medium">Tippgeber-Anteil</th>
                </tr>
              </thead>
              <tbody>
                {tippgeber.map((t) => (
                  <tr key={t.name} className="border-b border-border last:border-0">
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      {t.name}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{t.anzahlLeads}</td>
                    <td className="px-4 py-2.5 tabular-nums">{t.gewonnen}</td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                      {formatEURCents(t.provision)}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">
                      − {formatEURCents(t.tippgeberAnteil)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
