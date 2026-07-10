import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { PipelineBoard } from "./pipeline-board";
import { loadBoard } from "./board-data";
import type { Bereich } from "./deal-card";

/**
 * Sparten-Guard (Schleife 2 / Wunsch C): Berater ohne diese Sparte werden
 * umgeleitet. Die RLS blockt die Daten ohnehin — das hier ist nur die UX.
 */
async function guardBereich(bereich: Bereich) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("profiles")
    .select("rolle, bereich")
    .eq("id", user.id)
    .single();
  const erlaubt =
    me?.rolle === "geschaeftsfuehrung" ||
    !me?.bereich?.length ||
    me.bereich.includes(bereich);
  if (!erlaubt) redirect("/dashboard");
}

/** Gemeinsamer Board-Bildschirm für beide Bereiche (Immobilien / VV). */
export async function BoardScreen({
  bereich,
  title,
  subtitle,
}: {
  bereich: Bereich;
  title: string;
  subtitle: string;
}) {
  await guardBereich(bereich);
  const { stages, deals, beraterMap, error } = await loadBoard(bereich);

  return (
    <>
      <Topbar title={title} subtitle={subtitle}>
        <Button asChild>
          <Link href={`/deals/neu?bereich=${bereich}`}>
            <Plus className="mr-1 h-4 w-4" />
            Neuer Deal
          </Link>
        </Button>
      </Topbar>
      <div className="px-6 py-6">
        {error ? (
          <div className="rounded-xl border border-border bg-surface px-6 py-16 text-center">
            <h2 className="text-lg font-semibold">
              Pipeline konnte nicht geladen werden
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Prüfe deine Verbindung und versuche es erneut.
            </p>
          </div>
        ) : (
          <PipelineBoard
            stages={stages}
            deals={deals}
            beraterMap={beraterMap}
          />
        )}
      </div>
    </>
  );
}
