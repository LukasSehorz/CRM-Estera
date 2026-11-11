/**
 * Lead-SMS über seven.io mit Zustellprüfung.
 *
 * Ablauf:
 *  1. sendeLeadSms(): schickt die SMS und merkt sich die ID bei seven.io
 *     (Tabelle meta_lead_sms).
 *  2. smsNachfassen(): läuft bei jedem Abgleich (alle 5 Min.) und sofort,
 *     wenn seven.io einen Zustellbericht meldet (/api/meta/sms-status). Fragt den
 *     Status ab. Zugestellt: fertig. Nicht zugestellt (oder nach
 *     SMS_OHNE_BESTAETIGUNG_MIN noch keine Bestätigung): neu senden, höchstens
 *     SMS_MAX_VERSUCHE insgesamt. Scheitert auch der letzte Versuch: Alarm-Mail.
 *
 * Nichts hier darf den Lead-Import scheitern lassen: Fehler werden geloggt.
 *
 * Konfiguration (Netlify-Umgebungsvariablen):
 *  SEVEN_API_KEY        Schlüssel bei seven.io, Rechte „sms“ und „status“
 *  META_LEAD_SMS_TO     Handynummer(n), mit Komma getrennt
 *  META_LEAD_SMS_FROM   optional: Absendername (max. 11 Zeichen, Standard ADVIS)
 *  META_LEAD_ALARM_TO   optional: Empfänger der Alarm-Mail (mit Komma getrennt);
 *                       sonst META_LEAD_MAIL_TO
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const SMS_MAX_VERSUCHE = 3;
/** So lange warten wir auf „zugestellt“, bevor wir neu senden. */
export const SMS_OHNE_BESTAETIGUNG_MIN = 10;
/** Abstand vor dem dritten Versuch: Ein Handy ohne Netz braucht Zeit. */
export const SMS_PAUSE_VOR_LETZTEM_MIN = 4;
/** Ältere Zeilen fassen wir nicht mehr an (der Lead ist dann längst bekannt). */
const NACHFASSEN_STUNDEN = 6;

export type SmsZeile = {
  id: string;
  contact_id: string | null;
  meta_lead_id: string | null;
  empfaenger: string;
  nachricht: string;
  msg_id: string | null;
  versuch: number;
  status: "offen" | "zugestellt" | "fehlgeschlagen";
  seven_status: string | null;
  erledigt: boolean;
  created_at: string;
};

/** Schmale Schnittstelle zur Tabelle, damit sich der Ablauf ohne Datenbank testen lässt. */
export type SmsSpeicher = {
  anlegen(z: Omit<SmsZeile, "id" | "created_at">): Promise<void>;
  offene(seitIso: string): Promise<SmsZeile[]>;
  aendern(id: string, patch: Partial<SmsZeile>): Promise<void>;
  /** Für die Alarm-Mail: Name und Telefon des Leads. */
  kontakt(contactId: string): Promise<{ name: string; telefon: string | null } | null>;
};

export function supabaseSpeicher(admin: SupabaseClient): SmsSpeicher {
  // Die Tabelle steht (noch) nicht in den generierten Typen: untypisiert ansprechen.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = () => (admin as SupabaseClient<any>).from("meta_lead_sms");
  return {
    async anlegen(z) {
      const { error } = await t().insert(z);
      if (error) console.error("[lead-sms] Zeile anlegen fehlgeschlagen:", error.message);
    },
    async offene(seitIso) {
      const { data, error } = await t()
        .select("*")
        .eq("erledigt", false)
        .gte("created_at", seitIso)
        .order("created_at");
      if (error) {
        console.error("[lead-sms] Offene SMS nicht lesbar:", error.message);
        return [];
      }
      return (data ?? []) as SmsZeile[];
    },
    async aendern(id, patch) {
      const { error } = await t().update({ ...patch, geprueft_at: new Date().toISOString() }).eq("id", id);
      if (error) console.error("[lead-sms] Zeile ändern fehlgeschlagen:", error.message);
    },
    async kontakt(contactId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (admin as SupabaseClient<any>)
        .from("contacts")
        .select("vorname,nachname,telefon")
        .eq("id", contactId)
        .maybeSingle();
      if (!data) return null;
      return { name: `${data.vorname ?? ""} ${data.nachname ?? ""}`.trim(), telefon: data.telefon ?? null };
    },
  };
}

function sevenBase(): string {
  return process.env.SEVEN_API_BASE || "https://gateway.seven.io";
}

export function smsEmpfaenger(): string[] {
  return (process.env.META_LEAD_SMS_TO ?? "")
    .split(",")
    .map((n) => n.replace(/[^\d+]/g, ""))
    .filter(Boolean);
}

type SevenAntwort = {
  success?: string | number;
  messages?: { id?: string | number | null; recipient?: string; success?: boolean; error_text?: string | null }[];
};

/** Schickt eine SMS an einen Empfänger. Gibt die ID bei seven.io zurück oder den Fehlergrund. */
async function sevenSenden(an: string, text: string): Promise<{ msgId: string | null; fehler: string | null }> {
  const key = process.env.SEVEN_API_KEY;
  if (!key) return { msgId: null, fehler: "SEVEN_API_KEY fehlt" };
  try {
    const res = await fetch(`${sevenBase()}/api/sms`, {
      method: "POST",
      headers: { "X-Api-Key": key, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        to: an,
        text,
        from: (process.env.META_LEAD_SMS_FROM || "ADVIS").slice(0, 11),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as SevenAntwort;
    const m = json.messages?.[0];
    // seven.io meldet Erfolg mit dem Code 100 im Feld „success“.
    if (!res.ok || String(json.success) !== "100" || m?.success === false) {
      return { msgId: null, fehler: `HTTP ${res.status}, Code ${json.success ?? "?"}${m?.error_text ? `, ${m.error_text}` : ""}` };
    }
    return { msgId: m?.id != null ? String(m.id) : null, fehler: null };
  } catch (e) {
    return { msgId: null, fehler: (e as Error).message };
  }
}

/**
 * Erste SMS zu einem neuen Lead: an jeden Empfänger einzeln, je eine Zeile.
 * Ohne Schlüssel oder Empfänger passiert nichts (SMS ist nicht eingerichtet).
 */
export async function sendeLeadSms(
  speicher: SmsSpeicher,
  text: string,
  bezug: { contactId: string | null; metaLeadId: string | null },
) {
  const an = smsEmpfaenger();
  if (!process.env.SEVEN_API_KEY || an.length === 0) return;
  for (const nummer of an) {
    await sendenUndMerken(speicher, nummer, text, 1, bezug);
  }
}

async function sendenUndMerken(
  speicher: SmsSpeicher,
  nummer: string,
  text: string,
  versuch: number,
  bezug: { contactId: string | null; metaLeadId: string | null },
) {
  const { msgId, fehler } = await sevenSenden(nummer, text);
  if (fehler) console.error("[lead-sms] SMS fehlgeschlagen:", fehler, `Versuch ${versuch}`, `Lead ${bezug.metaLeadId ?? "?"}`);
  try {
    await speicher.anlegen({
      contact_id: bezug.contactId,
      meta_lead_id: bezug.metaLeadId,
      empfaenger: nummer,
      nachricht: text,
      msg_id: msgId,
      versuch,
      // Ohne ID lässt sich nichts prüfen: gleich als fehlgeschlagen führen, dann wird neu gesendet.
      status: msgId ? "offen" : "fehlgeschlagen",
      seven_status: fehler ? `Versand: ${fehler}`.slice(0, 200) : null,
      erledigt: false,
    });
  } catch (e) {
    console.error("[lead-sms] Zeile anlegen fehlgeschlagen:", (e as Error).message);
  }
}

const ENDGUELTIG_GESCHEITERT = new Set(["NOTDELIVERED", "REJECTED", "FAILED", "EXPIRED"]);

/**
 * Fragt bei seven.io den Status ab. null = Abfrage nicht möglich (z. B. fehlt dem
 * Schlüssel das Recht „status“): dann fassen wir nichts an, statt blind neu zu senden.
 */
async function sevenStatus(ids: string[]): Promise<Map<string, string> | null> {
  const key = process.env.SEVEN_API_KEY;
  if (!key || ids.length === 0) return new Map();
  try {
    const res = await fetch(`${sevenBase()}/api/status?msg_id=${encodeURIComponent(ids.join(","))}`, {
      headers: { "X-Api-Key": key, Accept: "application/json" },
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as unknown;
    const liste = Array.isArray(json) ? json : json && typeof json === "object" && "id" in json ? [json] : null;
    if (!res.ok || !liste) {
      console.error(
        "[lead-sms] Zustellstatus nicht abfragbar (hat der seven-Schlüssel das Recht „status“?):",
        res.status,
        JSON.stringify(json ?? "").slice(0, 200),
      );
      return null;
    }
    const map = new Map<string, string>();
    for (const e of liste as { id?: string | number; status?: string | null }[]) {
      if (e.id != null && e.status) map.set(String(e.id), String(e.status).toUpperCase());
    }
    return map;
  } catch (e) {
    console.error("[lead-sms] Zustellstatus nicht abfragbar:", (e as Error).message);
    return null;
  }
}

/** Wiederholung kenntlich machen; seven.io lehnt denselben Text binnen 3 Min. sonst ab. */
export function wiederholungsText(text: string, versuch: number): string {
  const basis = text.replace(/ \(\d\)$/, "");
  return `${basis} (${versuch})`;
}

export type NachfassErgebnis = {
  geprueft: number;
  zugestellt: number;
  neuGesendet: number;
  alarm: number;
  statusLesbar: boolean;
};

export async function smsNachfassen(speicher: SmsSpeicher, jetzt = new Date()): Promise<NachfassErgebnis> {
  const erg: NachfassErgebnis = { geprueft: 0, zugestellt: 0, neuGesendet: 0, alarm: 0, statusLesbar: true };
  const seit = new Date(jetzt.getTime() - NACHFASSEN_STUNDEN * 3600_000).toISOString();
  const zeilen = await speicher.offene(seit);
  if (zeilen.length === 0) return erg;

  const zuPruefen = zeilen.filter((z) => z.status === "offen" && z.msg_id);
  const status = await sevenStatus(zuPruefen.map((z) => z.msg_id!));
  if (status === null) {
    erg.statusLesbar = false;
    return erg;
  }

  for (const z of zeilen) {
    erg.geprueft++;
    const alterMin = (jetzt.getTime() - new Date(z.created_at).getTime()) / 60_000;
    let gescheitert = z.status === "fehlgeschlagen";
    let grund = z.seven_status;

    if (z.status === "offen") {
      const s = z.msg_id ? status.get(z.msg_id) : undefined;
      if (s === "DELIVERED") {
        await speicher.aendern(z.id, { status: "zugestellt", seven_status: s, erledigt: true });
        erg.zugestellt++;
        continue;
      }
      if (s && ENDGUELTIG_GESCHEITERT.has(s)) {
        gescheitert = true;
        grund = s;
      } else if (alterMin >= SMS_OHNE_BESTAETIGUNG_MIN) {
        gescheitert = true;
        grund = `${s ?? "kein Status"}, nach ${SMS_OHNE_BESTAETIGUNG_MIN} Min. nicht bestätigt`;
      } else {
        // Noch unterwegs: beim nächsten Lauf wieder ansehen.
        if (s && s !== z.seven_status) await speicher.aendern(z.id, { seven_status: s });
        continue;
      }
    }
    if (!gescheitert) continue;

    if (z.versuch < SMS_MAX_VERSUCHE) {
      // Vor dem letzten Versuch etwas Abstand lassen (Handy kurz ohne Netz).
      if (z.versuch + 1 === SMS_MAX_VERSUCHE && alterMin < SMS_PAUSE_VOR_LETZTEM_MIN) {
        if (z.status === "offen") await speicher.aendern(z.id, { status: "fehlgeschlagen", seven_status: grund });
        continue;
      }
      await speicher.aendern(z.id, { status: "fehlgeschlagen", seven_status: grund, erledigt: true });
      await sendenUndMerken(speicher, z.empfaenger, wiederholungsText(z.nachricht, z.versuch + 1), z.versuch + 1, {
        contactId: z.contact_id,
        metaLeadId: z.meta_lead_id,
      });
      console.log(`[lead-sms] SMS nicht zugestellt (${grund ?? "?"}), Versuch ${z.versuch + 1} gesendet. Lead ${z.meta_lead_id ?? "?"}`);
      erg.neuGesendet++;
    } else {
      await speicher.aendern(z.id, { status: "fehlgeschlagen", seven_status: grund, erledigt: true });
      console.error(`[lead-sms] SMS nach ${SMS_MAX_VERSUCHE} Versuchen nicht zugestellt (${grund ?? "?"}). Lead ${z.meta_lead_id ?? "?"}`);
      await alarmMail(speicher, z, grund);
      erg.alarm++;
    }
  }
  return erg;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

/** Letzte Stufe: Die SMS kam auch nach allen Versuchen nicht an. */
async function alarmMail(speicher: SmsSpeicher, z: SmsZeile, grund: string | null) {
  const key = process.env.RESEND_API_KEY;
  const an = (process.env.META_LEAD_ALARM_TO || process.env.META_LEAD_MAIL_TO || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!key || an.length === 0) return;
  const k = z.contact_id ? await speicher.kontakt(z.contact_id).catch(() => null) : null;
  const base = (process.env.URL || process.env.NEXT_PUBLIC_SITE_URL || "https://estera-crm.netlify.app").replace(/\/$/, "");
  const html = `
<div style="font-family:Arial,sans-serif;font-size:15px;color:#111">
  <p><b>Die SMS zu einem neuen Lead ist nicht angekommen</b> (${SMS_MAX_VERSUCHE} Versuche an ${esc(z.empfaenger)}).</p>
  <p>Bitte den Lead direkt anrufen:</p>
  <p><b>${esc(k?.name || "Name im CRM")}</b>${k?.telefon ? `<br><a href="tel:${esc(k.telefon)}">${esc(k.telefon)}</a>` : ""}</p>
  <p style="color:#444">Text der SMS:<br>${esc(z.nachricht)}</p>
  ${z.contact_id ? `<p><a href="${base}/kontakte/${z.contact_id}">Im CRM öffnen</a></p>` : ""}
  <p style="color:#888;font-size:13px">Meldung des Mobilfunknetzes: ${esc(grund ?? "unbekannt")}</p>
</div>`;
  try {
    const res = await fetch(`${process.env.RESEND_API_BASE || "https://api.resend.com"}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.META_LEAD_MAIL_FROM || "Estera CRM <crm@estera.immobilien>",
        to: an,
        subject: `SMS nicht angekommen: Lead ${k?.name ?? ""} bitte direkt anrufen`.replace(/\s+/g, " "),
        html,
      }),
    });
    if (!res.ok) console.error("[lead-sms] Alarm-Mail fehlgeschlagen:", res.status, await res.text().catch(() => ""));
  } catch (e) {
    console.error("[lead-sms] Alarm-Mail fehlgeschlagen:", (e as Error).message);
  }
}
