import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Frischt die Supabase-Session auf UND schützt die Routen (Phase 2):
 * - Nicht eingeloggt + geschützte Route  -> Redirect auf /login
 * - Eingeloggt + /login oder /           -> Redirect auf /dashboard
 *
 * Hinweis: Das ist die erste Verteidigungslinie (Komfort/UX). Die
 * eigentliche Datensicherheit liegt in der Postgres-RLS (siehe 0002_rls.sql).
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Session auffrischen / aktuellen Nutzer ermitteln.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isAuthRoute = path === "/login" || path.startsWith("/auth");
  // Design-Preview: statische Token-/Farbschau mit Dummy-Daten, ohne Login
  // erreichbar (keine echten Daten — Sicherheit liegt in der RLS).
  const isPublicRoute = path === "/design-preview";

  // Redirect-Antwort, die die (ggf. aufgefrischten) Auth-Cookies mitnimmt.
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    const res = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  if (!user && !isAuthRoute && !isPublicRoute) return redirectTo("/login");
  if (user && (path === "/login" || path === "/")) return redirectTo("/dashboard");

  return supabaseResponse;
}
