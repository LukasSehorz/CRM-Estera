import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { type KundenSegment } from "@/config/enums";
import { ContactsTable, type ContactRow } from "./contacts-table";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <Users className="h-6 w-6" />
      </span>
      <h2 className="text-lg font-semibold">Noch keine Kunden</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Lege deinen ersten Kunden an, um Leads und Bestandskunden zu verwalten.
      </p>
      <Button asChild className="mt-2">
        <Link href="/kontakte/neu">
          <Plus className="mr-1 h-4 w-4" />
          Kunden anlegen
        </Link>
      </Button>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="rounded-xl border border-border bg-surface px-6 py-16 text-center">
      <h2 className="text-lg font-semibold">
        Kunden konnten nicht geladen werden
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Prüfe deine Verbindung und versuche es erneut.
      </p>
    </div>
  );
}

export default async function KontaktePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isGf = false;
  if (user) {
    const { data: me } = await supabase
      .from("profiles")
      .select("rolle")
      .eq("id", user.id)
      .single();
    isGf = me?.rolle === "geschaeftsfuehrung";
  }

  const { data: contacts, error } = await supabase
    .from("contacts")
    .select(
      "id, vorname, nachname, email, telefon, status, termin_status, leadquelle, interesse, nettoverdienst_monatlich, eigenkapital, einschaetzung, berater_id, created_at",
    )
    .order("created_at", { ascending: false });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, vorname, nachname");
  const beraterMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, `${p.vorname} ${p.nachname}`]),
  );

  // Segment je Kunde (4.2, berechnet): Bestandskunde (≥1 gewonnener Deal) >
  // In Pipeline (≥1 offener Deal) > Interessent (kein Deal).
  const { data: dealsForSegment } = await supabase
    .from("deals")
    .select("contact_id, pipeline_stages!inner(is_won, is_lost)");
  const segmentMap: Record<string, KundenSegment> = {};
  for (const d of dealsForSegment ?? []) {
    const st = (
      Array.isArray(d.pipeline_stages) ? d.pipeline_stages[0] : d.pipeline_stages
    ) as { is_won: boolean; is_lost: boolean } | null;
    const cur = segmentMap[d.contact_id];
    if (st?.is_won) segmentMap[d.contact_id] = "bestand";
    else if (!st?.is_lost && cur !== "bestand")
      segmentMap[d.contact_id] = "pipeline";
    else if (!cur) segmentMap[d.contact_id] = "interessent";
  }

  return (
    <>
      <Topbar
        title="Kunden"
        subtitle="Leads, Interessenten & Bestandskunden"
      >
        <Button asChild>
          <Link href="/kontakte/neu">
            <Plus className="mr-1 h-4 w-4" />
            Neuer Kunde
          </Link>
        </Button>
      </Topbar>
      <div className="px-6 py-6">
        {error ? (
          <ErrorState />
        ) : !contacts || contacts.length === 0 ? (
          <EmptyState />
        ) : (
          <ContactsTable
            contacts={contacts as ContactRow[]}
            beraterMap={beraterMap}
            segmentMap={segmentMap}
            isGf={isGf}
          />
        )}
      </div>
    </>
  );
}
