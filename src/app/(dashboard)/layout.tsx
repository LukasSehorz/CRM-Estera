import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DesktopSidebar, MobileNav } from "@/components/layout/app-sidebar";
import { Toaster } from "@/components/ui/sonner";

/**
 * Geschützter Bereich. Middleware leitet nicht eingeloggte Nutzer bereits auf
 * /login; hier zusätzlich serverseitig absichern und das Shell-Layout
 * (Sidebar + Content) aufbauen.
 */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("vorname, nachname, rolle, bereich, aktiv, avatar_url")
    .eq("id", user.id)
    .single();

  // Leaver-Sperre (DSGVO Art. 32): Ein gesperrtes Konto verliert sofort den
  // Zugang — auch wenn die Session noch gültig ist. Die RLS verweigert einem
  // gesperrten Konto ohnehin jeden Datenzugriff (Migration 0032); hier wird
  // zusätzlich sauber abgemeldet, statt leere Seiten zu zeigen.
  // Kein Profil = verwaister Auth-Nutzer -> ebenfalls kein Zugang.
  if (!profile || !profile.aktiv) {
    await supabase.auth.signOut();
    redirect("/login?gesperrt=1");
  }

  // Ungelesene Benachrichtigungen (Zähler-Badge in der Navigation).
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("empfaenger_id", user.id)
    .eq("gelesen", false);

  // Finanzierer (Kunden-Feedback 22.07.): stark eingeschränkte Rolle — hat im
  // normalen CRM-Bereich nichts zu suchen, wird auf die eigene Ansicht geleitet.
  if (profile?.rolle === "finanzierer") redirect("/finanzierer");

  const isGf = profile?.rolle === "geschaeftsfuehrung";
  // Backoffice (2.5): Admin ohne Provisionsrechte — sieht beide Sparten.
  const isBackoffice = profile?.rolle === "backoffice";
  // Anzeige-Identität: immer das ECHTE Profil des Angemeldeten. Früher stand
  // hier fest „Ioannis Orfanidis" für jedes GF-Konto — seit es zwei
  // Geschäftsführer gibt, hätte sich Sebastian dort als Ioannis gesehen.
  const name = `${profile.vorname} ${profile.nachname}`.trim() || (user.email ?? "");
  const rolle = isGf
    ? "Geschäftsführer"
    : isBackoffice
      ? "Backoffice"
      : "Berater";

  // Profilbild: liegt im privaten Bucket, daher kurzlebiger signierter Link
  // (1 Stunde, deckt eine übliche Sitzung ab). Ohne Bild bleibt der
  // Platzhalter mit den Initialen.
  let fotoUrl: string | null = null;
  if (profile.avatar_url) {
    const { data: signed } = await supabase.storage
      .from("avatare")
      .createSignedUrl(profile.avatar_url, 3600);
    fotoUrl = signed?.signedUrl ?? null;
  }
  // Sparten-Sichtbarkeit: GF & Backoffice sehen immer beide.
  const bereiche: string[] =
    isGf || isBackoffice
      ? ["immobilien", "vv"]
      : profile?.bereich?.length
        ? profile.bereich
        : ["immobilien", "vv"];

  return (
    // Midnight-Theme: Luna-Blau in Hell & Dunkel (Umschalter in der Sidebar).
    <div className="theme-midnight min-h-screen bg-background text-foreground">
      {/* Ambient-Glow: zwei weiche Blau-Lichtquellen hinter dem Content —
          gibt jeder Seite Tiefe, passt sich über die Tokens beiden Modi an. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute -top-48 right-[-12%] h-[38rem] w-[38rem] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in srgb, var(--accent-500) 13%, transparent), transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[-22%] left-[-8%] h-[42rem] w-[42rem] rounded-full"
          style={{
            background:
              "radial-gradient(closest-side, color-mix(in srgb, var(--accent-600) 12%, transparent), transparent 72%)",
          }}
        />
      </div>

      <div className="relative z-10">
        <MobileNav
          name={name}
          rolle={rolle}
          isGf={isGf}
          isBackoffice={isBackoffice}
          bereiche={bereiche}
          fotoUrl={fotoUrl}
          hatBild={!!profile.avatar_url}
          unreadCount={unreadCount ?? 0}
        />
        <div className="lg:flex">
          <DesktopSidebar
            name={name}
            rolle={rolle}
            isGf={isGf}
            isBackoffice={isBackoffice}
            bereiche={bereiche}
            fotoUrl={fotoUrl}
            hatBild={!!profile.avatar_url}
            unreadCount={unreadCount ?? 0}
          />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
      <Toaster />
    </div>
  );
}
