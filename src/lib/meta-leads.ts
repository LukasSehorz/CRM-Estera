/**
 * Meta-Leads (Facebook/Instagram Sofortformulare) → Kontakte im CRM.
 *
 * Zwei Wege führen hierher, beide landen in importLead():
 *  1. Webhook (/api/meta/webhook): Meta meldet sofort „neuer Lead <id>".
 *  2. Abgleich (/api/meta/sync, alle 5 Min. per Netlify-Zeitplan): holt
 *     alle Leads der letzten Stunden direkt von der Seite. Fängt alles ab,
 *     was der Webhook verpasst (Ausfall, App noch im Entwicklungsmodus …).
 * Doppelte Anlage ist ausgeschlossen: contacts.meta_lead_id ist UNIQUE.
 *
 * Konfiguration (Netlify-Umgebungsvariablen, nie im Code):
 *  META_PAGE_ID            ID der Facebook-Seite, unter der die Anzeigen laufen
 *  META_PAGE_ACCESS_TOKEN  dauerhafter Seiten-Token mit leads_retrieval
 *  META_APP_SECRET         prüft die Signatur der Webhook-Aufrufe
 *  META_VERIFY_TOKEN       frei gewählt, bestätigt den Webhook bei Meta
 *  META_SYNC_SECRET        frei gewählt, schützt /api/meta/sync
 *  META_LEAD_BERATER_ID    Profil-ID, der neue Leads zugewiesen werden
 *  META_LEAD_INTERESSE     optional: "vv", "immobilien" oder "vv,immobilien"
 *  META_LEAD_MAIL_TO       optional: Empfänger der Mail (sonst Login-Mail des Beraters)
 *  RESEND_API_KEY          optional: ohne Schlüssel nur In-App-Benachrichtigung
 *  META_LEAD_MAIL_FROM     optional: Absender (Standard crm@estera.immobilien)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = SupabaseClient<Database>;
type Bereich = Database["public"]["Enums"]["bereich_enum"];

// META_GRAPH_BASE nur für lokale Tests gegen eine Attrappe.
const GRAPH = `${process.env.META_GRAPH_BASE || "https://graph.facebook.com"}/${process.env.META_GRAPH_VERSION || "v23.0"}`;

// ---------------------------------------------------------------------
// Graph-API
// ---------------------------------------------------------------------

export class MetaApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

async function graph<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new MetaApiError("META_PAGE_ACCESS_TOKEN fehlt.", 0);
  const qs = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(`${GRAPH}/${path}?${qs}`, { cache: "no-store" });
  const json = (await res.json().catch(() => ({}))) as {
    error?: { message?: string; code?: number };
  } & T;
  if (!res.ok || json.error) {
    // Token nie in Fehlermeldungen/Logs übernehmen — nur Metas Text.
    throw new MetaApiError(
      `Meta ${res.status}: ${json.error?.message ?? "unbekannter Fehler"}`,
      res.status,
    );
  }
  return json;
}

export type MetaLead = {
  id: string;
  created_time: string;
  field_data?: { name: string; values: string[] }[];
  ad_id?: string;
  ad_name?: string;
  adset_name?: string;
  campaign_name?: string;
  form_id?: string;
  platform?: string;
  is_organic?: boolean;
};

const LEAD_FIELDS_VOLL =
  "id,created_time,field_data,ad_id,ad_name,adset_name,campaign_name,form_id,platform,is_organic";
// Ohne Kampagnen-/Anzeigennamen: die brauchen Leserechte am Werbekonto.
// Fehlen die, liefert Meta lieber die Lead-Daten ohne Namen als gar nichts.
const LEAD_FIELDS_BASIS = "id,created_time,field_data,ad_id,form_id,platform,is_organic";

let ohneWerbekonto = false;

async function graphLeadFields<T>(path: string, params: Record<string, string>): Promise<T> {
  if (!ohneWerbekonto) {
    try {
      return await graph<T>(path, { ...params, fields: LEAD_FIELDS_VOLL });
    } catch (e) {
      if (!(e instanceof MetaApiError) || e.status === 0) throw e;
      ohneWerbekonto = true;
      console.warn("[meta-leads] Kampagnennamen nicht lesbar, weiter ohne:", e.message);
    }
  }
  return graph<T>(path, { ...params, fields: LEAD_FIELDS_BASIS });
}

export function fetchLead(leadId: string): Promise<MetaLead> {
  return graphLeadFields<MetaLead>(encodeURIComponent(leadId), {});
}

const formularNamen = new Map<string, string | null>();
async function formularName(formId: string | undefined): Promise<string | null> {
  if (!formId) return null;
  if (formularNamen.has(formId)) return formularNamen.get(formId)!;
  try {
    const f = await graph<{ name?: string }>(encodeURIComponent(formId), { fields: "name" });
    formularNamen.set(formId, f.name ?? null);
  } catch {
    formularNamen.set(formId, null);
  }
  return formularNamen.get(formId)!;
}

// ---------------------------------------------------------------------
// Formularfelder → Kontakt
// ---------------------------------------------------------------------

/** Metas Standard-Feldnamen; alles andere sind eigene Fragen des Formulars. */
const STANDARD = new Set([
  "full_name", "first_name", "last_name", "email", "phone_number", "phone",
]);

export type Geparst = {
  vorname: string;
  nachname: string;
  email: string | null;
  telefon: string | null;
  antworten: { frage: string; antwort: string }[];
};

export function parseFieldData(fields: MetaLead["field_data"]): Geparst {
  const get = (n: string) =>
    fields?.find((f) => f.name === n)?.values?.filter(Boolean).join(", ").trim() || "";

  let vorname = get("first_name");
  let nachname = get("last_name");
  const voll = get("full_name");
  if (!vorname && !nachname && voll) {
    const teile = voll.split(/\s+/);
    nachname = teile.length > 1 ? teile.pop()! : "";
    vorname = teile.join(" ");
  }
  // Pflichtfelder in der DB: lieber klar markieren als leer lassen.
  if (!vorname) vorname = "Meta-Lead";
  if (!nachname) nachname = "(ohne Nachname)";

  const email = get("email").toLowerCase() || null;
  const telefon = (get("phone_number") || get("phone")).replace(/[^\d+]/g, "") || null;

  const antworten = (fields ?? [])
    .filter((f) => !STANDARD.has(f.name))
    .map((f) => ({
      frage: f.name.replace(/_/g, " ").replace(/\?$/, "").trim() + "?",
      antwort: (f.values ?? []).join(", ").replace(/_/g, " ").trim(),
    }))
    .filter((a) => a.antwort);

  return { vorname, nachname, email, telefon, antworten };
}

function interesseAusEnv(): Bereich[] {
  return (process.env.META_LEAD_INTERESSE ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is Bereich => s === "vv" || s === "immobilien");
}

// ---------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------

export type ImportErgebnis =
  | { status: "angelegt"; contactId: string }
  | { status: "schon_da" };

export async function importLead(
  lead: MetaLead,
  admin: Admin = createAdminClient(),
): Promise<ImportErgebnis> {
  const beraterId = process.env.META_LEAD_BERATER_ID;
  if (!beraterId) throw new Error("META_LEAD_BERATER_ID fehlt.");

  // Schneller Vorab-Check spart Graph-Aufrufe beim Abgleich.
  const { data: vorhanden } = await admin
    .from("contacts")
    .select("id")
    .eq("meta_lead_id", lead.id)
    .maybeSingle();
  if (vorhanden) return { status: "schon_da" };

  const p = parseFieldData(lead.field_data);
  const formular = await formularName(lead.form_id);

  const { data: neu, error } = await admin
    .from("contacts")
    .upsert(
      {
        vorname: p.vorname,
        nachname: p.nachname,
        email: p.email,
        telefon: p.telefon,
        berater_id: beraterId,
        status: "Neu",
        leadquelle: lead.platform === "ig" ? "Instagram" : "Facebook",
        interesse: interesseAusEnv(),
        meta_lead_id: lead.id,
        meta_kampagne: lead.campaign_name ?? null,
        meta_anzeige: lead.ad_name ?? null,
        meta_formular: formular,
        created_at: lead.created_time
          ? new Date(lead.created_time).toISOString()
          : undefined,
      },
      { onConflict: "meta_lead_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`Kontakt anlegen fehlgeschlagen: ${error.message}`);
  // ignoreDuplicates: parallel schon angelegt (Webhook + Abgleich zugleich).
  if (!neu) return { status: "schon_da" };

  // Timeline: Herkunft + alle eigenen Fragen des Formulars.
  const zeilen = [
    `Neuer Lead aus Meta-Anzeige (${lead.platform === "ig" ? "Instagram" : "Facebook"}${lead.is_organic ? ", organisch" : ""}).`,
    lead.campaign_name ? `Kampagne: ${lead.campaign_name}` : null,
    lead.adset_name ? `Anzeigengruppe: ${lead.adset_name}` : null,
    lead.ad_name ? `Anzeige: ${lead.ad_name}` : null,
    formular ? `Formular: ${formular}` : null,
    ...(p.antworten.length
      ? ["", "Antworten im Formular:", ...p.antworten.map((a) => `• ${a.frage} ${a.antwort}`)]
      : []),
  ].filter((z): z is string => z !== null);

  await admin.from("contact_activities").insert({
    contact_id: neu.id,
    typ: "system",
    text: zeilen.join("\n"),
    created_by: null,
  });

  // Benachrichtigung darf den Import nie scheitern lassen: der Kontakt
  // steht zu diesem Zeitpunkt schon im CRM.
  try {
    await benachrichtigen(admin, beraterId, neu.id, p, lead, formular);
  } catch (e) {
    console.error("[meta-leads] Benachrichtigung fehlgeschlagen:", (e as Error).message);
  }

  return { status: "angelegt", contactId: neu.id };
}

// ---------------------------------------------------------------------
// Benachrichtigung (In-App immer, Mail wenn Resend eingerichtet)
// ---------------------------------------------------------------------

function siteUrl(): string {
  const u = process.env.URL || process.env.NEXT_PUBLIC_SITE_URL || "https://estera-crm.netlify.app";
  return u.replace(/\/$/, "");
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

async function benachrichtigen(
  admin: Admin,
  beraterId: string,
  contactId: string,
  p: Geparst,
  lead: MetaLead,
  formular: string | null,
) {
  const name = `${p.vorname} ${p.nachname}`;
  const link = `/kontakte/${contactId}`;

  const { error: nErr } = await admin.from("notifications").insert({
    empfaenger_id: beraterId,
    erzeugt_von: null,
    typ: "info",
    titel: `Neuer Meta-Lead: ${name}`,
    text: [p.telefon, lead.campaign_name ?? formular].filter(Boolean).join(" · ") || null,
    link,
  });
  if (nErr) console.error("[meta-leads] In-App-Benachrichtigung fehlgeschlagen:", nErr.message);

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return;

  let to = process.env.META_LEAD_MAIL_TO || "";
  if (!to) {
    const { data } = await admin.auth.admin.getUserById(beraterId);
    to = data.user?.email ?? "";
  }
  if (!to) return;

  const url = `${siteUrl()}${link}`;
  const zeile = (k: string, v: string | null | undefined) =>
    v ? `<tr><td style="padding:4px 12px 4px 0;color:#666">${k}</td><td style="padding:4px 0"><b>${esc(v)}</b></td></tr>` : "";
  const html = `
<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">
  <p>Neuer Lead aus der Meta-Anzeige. Am besten gleich anrufen.</p>
  <table>
    ${zeile("Name", name)}
    ${zeile("Telefon", p.telefon)}
    ${zeile("E-Mail", p.email)}
    ${zeile("Kampagne", lead.campaign_name)}
    ${zeile("Formular", formular)}
  </table>
  <p><a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Im CRM öffnen</a></p>
  ${p.telefon ? `<p><a href="tel:${esc(p.telefon)}">${esc(p.telefon)} anrufen</a></p>` : ""}
</div>`;

  try {
    const res = await fetch(`${process.env.RESEND_API_BASE || "https://api.resend.com"}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.META_LEAD_MAIL_FROM || "Estera CRM <crm@estera.immobilien>",
        to: [to],
        subject: `Neuer Lead: ${name}${p.telefon ? ` · ${p.telefon}` : ""}`,
        html,
      }),
    });
    if (!res.ok) {
      console.error("[meta-leads] Mail fehlgeschlagen:", res.status, await res.text().catch(() => ""));
    }
  } catch (e) {
    console.error("[meta-leads] Mail fehlgeschlagen:", (e as Error).message);
  }
}

// ---------------------------------------------------------------------
// Abgleich: alle Formulare der Seite, Leads der letzten Stunden
// ---------------------------------------------------------------------

export async function syncRecent(stunden = 48) {
  const pageId = process.env.META_PAGE_ID;
  if (!pageId) throw new Error("META_PAGE_ID fehlt.");
  const admin = createAdminClient();
  const seit = Math.floor(Date.now() / 1000) - stunden * 3600;

  const ergebnis = { formulare: 0, gesehen: 0, angelegt: 0, fehler: [] as string[] };

  type Seite<T> = { data: T[]; paging?: { cursors?: { after?: string }; next?: string } };
  const formIds: { id: string; name?: string }[] = [];
  let formAfter: string | undefined;
  do {
    const page: Seite<{ id: string; name?: string }> = await graph(
      `${encodeURIComponent(pageId)}/leadgen_forms`,
      { fields: "id,name", limit: "100", ...(formAfter ? { after: formAfter } : {}) },
    );
    formIds.push(...page.data);
    formAfter = page.paging?.next ? page.paging.cursors?.after : undefined;
  } while (formAfter);
  ergebnis.formulare = formIds.length;
  for (const f of formIds) if (f.name) formularNamen.set(f.id, f.name);

  const filter = JSON.stringify([
    { field: "time_created", operator: "GREATER_THAN", value: seit },
  ]);

  for (const f of formIds) {
    let after: string | undefined;
    do {
      const page: Seite<MetaLead> =
        await graphLeadFields(`${encodeURIComponent(f.id)}/leads`, {
          filtering: filter,
          limit: "100",
          ...(after ? { after } : {}),
        });
      for (const lead of page.data) {
        ergebnis.gesehen++;
        try {
          const r = await importLead({ ...lead, form_id: lead.form_id ?? f.id }, admin);
          if (r.status === "angelegt") ergebnis.angelegt++;
        } catch (e) {
          ergebnis.fehler.push(`${lead.id}: ${(e as Error).message}`);
        }
      }
      after = page.paging?.next ? page.paging.cursors?.after : undefined;
    } while (after);
  }
  return ergebnis;
}
