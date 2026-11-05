import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { fetchLead, importLead } from "@/lib/meta-leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bestätigung bei Meta (einmalig beim Eintragen der Webhook-URL):
 * Meta ruft GET mit hub.verify_token auf; stimmt er, geben wir die
 * Challenge zurück.
 */
export function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const erwartet = process.env.META_VERIFY_TOKEN;
  if (
    erwartet &&
    p.get("hub.mode") === "subscribe" &&
    p.get("hub.verify_token") === erwartet
  ) {
    return new NextResponse(p.get("hub.challenge") ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

function signaturGueltig(body: string, header: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const soll = Buffer.from(
    "sha256=" + createHmac("sha256", secret).update(body, "utf8").digest("hex"),
  );
  const ist = Buffer.from(header);
  return soll.length === ist.length && timingSafeEqual(soll, ist);
}

type WebhookBody = {
  object?: string;
  entry?: {
    changes?: { field?: string; value?: { leadgen_id?: string; page_id?: string } }[];
  }[];
};

/**
 * Meta meldet neue Leads. Nur signierte Aufrufe werden verarbeitet.
 * Antwort ist immer 200 (außer bei falscher Signatur): schlägt der Import
 * fehl, holt ihn der Abgleich alle 5 Min. nach — so schaltet Meta den
 * Webhook nicht wegen wiederholter Fehler ab.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  if (!signaturGueltig(body, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  let data: WebhookBody;
  try {
    data = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const seite = process.env.META_PAGE_ID;
  const ids = (data.entry ?? [])
    .flatMap((e) => e.changes ?? [])
    .filter((c) => c.field === "leadgen" && c.value?.leadgen_id)
    .filter((c) => !seite || !c.value?.page_id || c.value.page_id === seite)
    .map((c) => c.value!.leadgen_id!);

  for (const id of ids) {
    try {
      const lead = await fetchLead(id);
      const r = await importLead(lead);
      console.log(`[meta-webhook] Lead ${id}: ${r.status}`);
    } catch (e) {
      console.error(`[meta-webhook] Lead ${id} nicht importiert:`, (e as Error).message);
    }
  }
  return NextResponse.json({ ok: true });
}
