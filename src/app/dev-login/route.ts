import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * NUR LOKAL: Anmeldung ohne Passworteingabe für Layout-Tests.
 * Greift ausschließlich, wenn ALLE drei Bedingungen erfüllt sind:
 *  1. `next dev` (NODE_ENV=development) — im Produktiv-Build nie,
 *  2. die Datenbank ist eine lokale Supabase (localhost/127.0.0.1),
 *  3. DEV_LOGIN_EMAIL und DEV_LOGIN_PASSWORD sind gesetzt
 *     (nur in .env.development.local, nie in Netlify).
 * Sonst: 404, als gäbe es die Seite nicht.
 *
 * /dev-login          → Testkonto Geschäftsführung
 * /dev-login?als=berater → Testkonto Berater (Rechte-Gegenprobe)
 */
export async function GET(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const lokal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/.test(url);
  const berater = req.nextUrl.searchParams.get("als") === "berater";
  const email = berater ? process.env.DEV_LOGIN_BERATER_EMAIL : process.env.DEV_LOGIN_EMAIL;
  const password = berater
    ? process.env.DEV_LOGIN_BERATER_PASSWORD
    : process.env.DEV_LOGIN_PASSWORD;

  if (process.env.NODE_ENV !== "development" || !lokal || !email || !password) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const supabase = await createClient();
  await supabase.auth.signOut();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return new NextResponse(`Test-Anmeldung fehlgeschlagen: ${error.message}`, { status: 500 });
  }
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
