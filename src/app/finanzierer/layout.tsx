import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BRANDING } from "@/config/branding";
import { logout } from "@/app/(dashboard)/actions";
import { LogOut } from "lucide-react";

/**
 * Eigener, minimaler Bereich für die Rolle „Finanzierer" (Kunden-Feedback
 * 22.07.). Keine CRM-Navigation — der Finanzierer sieht ausschließlich die ihm
 * freigeschalteten Dokumente. Zugriffsschutz zusätzlich per RLS/RPC in der DB.
 */
export default async function FinanziererLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("rolle, aktiv")
    .eq("id", user.id)
    .single();
  // Leaver-Sperre (DSGVO Art. 32): gesperrtes Konto = sofort kein Zugang mehr.
  // Besonders wichtig hier — der Finanzierer ist ein EXTERNER Empfänger.
  if (!profile || !profile.aktiv) {
    await supabase.auth.signOut();
    redirect("/login?gesperrt=1");
  }
  // Nur Finanzierer — alle anderen zurück ins normale CRM.
  if (profile.rolle !== "finanzierer") redirect("/dashboard");

  return (
    <div className="theme-midnight min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/85 px-6 backdrop-blur">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={BRANDING.wordmarkSrc}
          alt={BRANDING.company}
          className="h-6 w-auto object-contain dark:brightness-0 dark:invert"
        />
        <form action={logout}>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </button>
        </form>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
    </div>
  );
}
