import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DesktopSidebar, MobileNav } from "@/components/layout/app-sidebar";
import { Toaster } from "@/components/ui/sonner";

const ROLLE_LABEL: Record<string, string> = {
  geschaeftsfuehrung: "Geschäftsführung",
  berater: "Berater",
  backoffice: "Backoffice",
};

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
    .select("vorname, nachname, rolle, bereich")
    .eq("id", user.id)
    .single();

  const name = profile
    ? `${profile.vorname} ${profile.nachname}`
    : (user.email ?? "");
  const rolle = profile ? (ROLLE_LABEL[profile.rolle] ?? profile.rolle) : "";
  const isGf = profile?.rolle === "geschaeftsfuehrung";
  // Backoffice (2.5): Admin ohne Provisionsrechte — sieht beide Sparten.
  const isBackoffice = profile?.rolle === "backoffice";
  const bereiche: string[] =
    isGf || isBackoffice
      ? ["immobilien", "vv"]
      : profile?.bereich?.length
        ? profile.bereich
        : ["immobilien", "vv"];

  return (
    <div className="min-h-screen">
      <MobileNav
        name={name}
        rolle={rolle}
        isGf={isGf}
        isBackoffice={isBackoffice}
        bereiche={bereiche}
      />
      <div className="lg:flex">
        <DesktopSidebar
          name={name}
          rolle={rolle}
          isGf={isGf}
          isBackoffice={isBackoffice}
          bereiche={bereiche}
        />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
