import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Phase 0: nur Session-Refresh. Routen-Schutz folgt in Phase 2.
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Auf alle Pfade anwenden, außer:
     * - _next/static, _next/image (Build-Assets)
     * - favicon.ico
     * - gängige Bilddateien
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
