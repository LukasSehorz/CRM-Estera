import { NextResponse } from "next/server";
import { leadSmsNachfassen } from "@/lib/meta-leads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Zustellbericht von seven.io (Webhook, Ereignis „dlr“).
 *
 * Der Inhalt des Aufrufs wird bewusst NICHT ausgewertet: Er dient nur als
 * Anstoß. Den echten Status fragt das CRM selbst mit seinem Schlüssel bei
 * seven.io ab (smsNachfassen). So braucht dieser Endpunkt kein Geheimnis,
 * und ein gefälschter Aufruf kann nichts auslösen außer einer Abfrage.
 * Ohne den Webhook läuft dieselbe Prüfung alle 5 Min. im Abgleich mit.
 */
async function anstoss() {
  try {
    const r = await leadSmsNachfassen();
    if (r.geprueft) console.log("[lead-sms] (Zustellbericht)", JSON.stringify(r));
  } catch (e) {
    console.error("[lead-sms] Nachfassen fehlgeschlagen:", (e as Error).message);
  }
  return NextResponse.json({ ok: true });
}

export async function POST() {
  return anstoss();
}

export async function GET() {
  return anstoss();
}
