// Netlify-Zeitplan-Funktion: ruft alle 5 Minuten den Meta-Lead-Abgleich
// des CRM auf (/api/meta/sync). Läuft nur auf dem Produktiv-Deploy.
// Sicherheitsnetz für den Webhook: was der verpasst, holt dieser Lauf nach.
// (Ohne @netlify/functions-Import, damit keine neue Abhängigkeit nötig ist.)

export default async () => {
  const base = process.env.URL;
  const secret = process.env.META_SYNC_SECRET;
  if (!base || !secret || !process.env.META_PAGE_ACCESS_TOKEN) {
    // Noch nicht eingerichtet: still überspringen statt Fehler-Spam im Log.
    return new Response("nicht eingerichtet", { status: 200 });
  }
  const res = await fetch(`${base}/api/meta/sync?stunden=48`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  const text = await res.text();
  if (!res.ok) console.error("[meta-lead-abgleich]", res.status, text.slice(0, 500));
  return new Response(text, { status: res.status });
};

export const config = {
  schedule: "*/5 * * * *",
};
