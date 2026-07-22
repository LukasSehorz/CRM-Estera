import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FinanziererHome } from "./finanzierer-home";
import { type FinKunde } from "./finanzierer-view";
import { type FinTask } from "./finanzierer-aufgaben";
import { type NotificationItem } from "@/app/(dashboard)/benachrichtigungen/benachrichtigungen-list";

/**
 * Finanzierer-Startseite mit drei Bereichen: freigeschaltete Dokumente, die
 * ihm zugewiesenen Aufgaben und seine Benachrichtigungen. Zugriff strikt über
 * RLS/RPCs — er sieht nur eigene Daten.
 */
export default async function FinanziererPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: kd }, { data: tasks }, { data: notifs }] = await Promise.all([
    supabase.rpc("finanzierer_kunden"),
    supabase
      .from("tasks")
      .select("id, titel, beschreibung, faellig_am, erledigt")
      .eq("assigned_to", user.id)
      .order("erledigt", { ascending: true })
      .order("faellig_am", { ascending: true, nullsFirst: false }),
    supabase
      .from("notifications")
      .select("id, typ, titel, text, link, gelesen, created_at")
      .eq("empfaenger_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const kunden: FinKunde[] = (kd ?? []).map((k) => ({
    contactId: k.contact_id,
    name: k.name,
  }));

  return (
    <FinanziererHome
      kunden={kunden}
      aufgaben={(tasks ?? []) as FinTask[]}
      benachrichtigungen={(notifs ?? []) as NotificationItem[]}
    />
  );
}
