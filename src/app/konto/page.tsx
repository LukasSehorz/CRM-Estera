import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PasswortForm } from "./passwort-form";

/**
 * „Mein Konto" — eigenes Passwort ändern. Liegt bewusst AUSSERHALB der
 * (dashboard)-Gruppe: deren Layout leitet Finanzierer nach /finanzierer um,
 * damit wäre die Seite für sie nicht erreichbar. So gilt sie für jede Rolle.
 */
export default async function KontoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profil } = await supabase
    .from("profiles")
    .select("vorname, nachname, rolle")
    .eq("id", user.id)
    .single();

  // Zurück dorthin, wo die jeweilige Rolle zu Hause ist.
  const zurueck = profil?.rolle === "finanzierer" ? "/finanzierer" : "/dashboard";

  return (
    <div className="theme-midnight min-h-screen bg-background text-foreground">
      <div className="mx-auto w-full max-w-lg px-6 py-10">
        <Link
          href={zurueck}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Zurück
        </Link>

        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent-500/15 text-accent-500">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-base font-semibold">Passwort ändern</h1>
              <p className="truncate text-xs text-muted-foreground">
                {profil ? `${profil.vorname} ${profil.nachname} · ` : ""}
                {user.email}
              </p>
            </div>
          </div>

          <PasswortForm email={user.email ?? ""} />

          <p className="mt-5 border-t border-border pt-4 text-xs text-muted-foreground">
            Wähle ein Passwort, das du nirgendwo sonst verwendest. Estera kann
            dein Passwort nicht einsehen.
          </p>
        </div>
      </div>
    </div>
  );
}
