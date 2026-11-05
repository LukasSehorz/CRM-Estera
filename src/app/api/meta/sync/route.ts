import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { syncRecent } from "@/lib/meta-leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function berechtigt(req: NextRequest): boolean {
  const secret = process.env.META_SYNC_SECRET;
  const header = req.headers.get("authorization") ?? "";
  if (!secret) return false;
  const soll = Buffer.from(`Bearer ${secret}`);
  const ist = Buffer.from(header);
  return soll.length === ist.length && timingSafeEqual(soll, ist);
}

/**
 * Abgleich: holt die Meta-Leads der letzten Stunden und legt fehlende an.
 * Wird alle 5 Min. von der Netlify-Zeitplan-Funktion aufgerufen
 * (netlify/functions/meta-lead-abgleich.mts). ?stunden=… für Nachholläufe
 * (max. 90 Tage = so lange hält Meta die Leads vor).
 */
export async function POST(req: NextRequest) {
  if (!berechtigt(req)) return new NextResponse("Forbidden", { status: 403 });
  const stunden = Math.min(
    Math.max(Number(req.nextUrl.searchParams.get("stunden")) || 48, 1),
    90 * 24,
  );
  try {
    const r = await syncRecent(stunden);
    if (r.angelegt || r.fehler.length) console.log("[meta-sync]", JSON.stringify(r));
    return NextResponse.json(r);
  } catch (e) {
    console.error("[meta-sync] Abgleich fehlgeschlagen:", (e as Error).message);
    return NextResponse.json({ fehler: (e as Error).message }, { status: 500 });
  }
}
