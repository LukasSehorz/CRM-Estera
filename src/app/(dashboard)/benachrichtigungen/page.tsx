import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Topbar } from "@/components/layout/topbar";
import {
  BenachrichtigungenListe,
  type NotificationItem,
} from "./benachrichtigungen-list";

/** In-App-Benachrichtigungen des angemeldeten Nutzers (Kunden-Feedback 22.07.). */
export default async function BenachrichtigungenPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("notifications")
    .select("id, typ, titel, text, link, gelesen, created_at")
    .eq("empfaenger_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <>
      <Topbar
        title="Benachrichtigungen"
        subtitle="Zugewiesene Aufgaben, Dokument-Freigaben & Hinweise"
      />
      <div className="px-6 py-6">
        <BenachrichtigungenListe items={(data ?? []) as NotificationItem[]} />
      </div>
    </>
  );
}
