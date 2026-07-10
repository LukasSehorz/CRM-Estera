import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { ContactsTable, type ContactRow } from "./contacts-table";

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface px-6 py-16 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <Users className="h-6 w-6" />
      </span>
      <h2 className="text-lg font-semibold">Noch keine Kontakte</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Lege deinen ersten Kontakt an, um Leads und Kunden zu verwalten.
      </p>
      <Button asChild className="mt-2">
        <Link href="/kontakte/neu">
          <Plus className="mr-1 h-4 w-4" />
          Kontakt anlegen
        </Link>
      </Button>
    </div>
  );
}

function ErrorState() {
  return (
    <div className="rounded-xl border border-border bg-surface px-6 py-16 text-center">
      <h2 className="text-lg font-semibold">
        Kontakte konnten nicht geladen werden
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
      "id, vorname, nachname, email, telefon, status, termin_status, leadquelle, interesse, finanzierungsrahmen_betrag, berater_id, created_at",
    )
    .order("created_at", { ascending: false });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, vorname, nachname");
  const beraterMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, `${p.vorname} ${p.nachname}`]),
  );

  return (
    <>
      <Topbar
        title="Kontakte"
        subtitle="Alle Leads und Kunden"
      >
        <Button asChild>
          <Link href="/kontakte/neu">
            <Plus className="mr-1 h-4 w-4" />
            Neuer Kontakt
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
            isGf={isGf}
          />
        )}
      </div>
    </>
  );
}
