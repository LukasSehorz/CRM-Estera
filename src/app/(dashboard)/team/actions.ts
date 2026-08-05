"use server";

import { revalidatePath } from "next/cache";
import {
  createClient as createSupabaseAdmin,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications";
import type { Database } from "@/types/database";

type Bereich = Database["public"]["Enums"]["bereich_enum"];

/**
 * Begrüßung für einen frisch angelegten Zugang: weist auf das Startpasswort
 * hin und führt per Button direkt zur Passwort-Änderung (Wunsch Mandant
 * 30.07.). Schlägt das fehl, bleibt der Zugang trotzdem bestehen — der
 * Hinweis ist Komfort, kein Teil des Anlegens.
 */
async function begruessungHinweis(
  supabase: SupabaseClient<Database>,
  neuerNutzerId: string,
  erzeugtVon: string,
): Promise<void> {
  try {
    await createNotification(supabase, {
      empfaengerId: neuerNutzerId,
      erzeugtVon,
      typ: "info",
      titel: "Willkommen — bitte ändere dein Passwort",
      text: "Du hast ein Startpasswort erhalten. Vergib jetzt ein eigenes, das nur du kennst.",
      link: "/konto",
    });
  } catch {
    // bewusst still
  }
}

export type StufeResult = { ok: true } | { error: string };

/**
 * Setzt die Vertriebler-Stufe eines Beraters. Die eigentliche Berechtigung
 * (nur GF) erzwingt die SECURITY-DEFINER-Funktion set_vertriebler_stufe in der
 * DB — hier zusätzlich Basis-Validierung.
 */
export async function setVertrieblerStufe(
  beraterId: string,
  stufe: number,
): Promise<StufeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  if (Number.isNaN(stufe) || stufe < 0 || stufe > 100)
    return { error: "Stufe muss zwischen 0 und 100 liegen." };

  const { error } = await supabase.rpc("set_vertriebler_stufe", {
    target: beraterId,
    stufe,
  });
  if (error)
    return {
      error:
        "Speichern fehlgeschlagen — nur die Geschäftsführung darf Stufen setzen.",
    };
  revalidatePath("/team");
  return { ok: true };
}

/**
 * Setzt die sichtbaren Sparten eines Beraters (Schleife 2 / Wunsch C).
 * Berechtigung (nur GF) + "mindestens eine Sparte" erzwingt die
 * SECURITY-DEFINER-Funktion set_berater_bereiche in der DB.
 */
export async function setBeraterBereiche(
  beraterId: string,
  bereiche: Bereich[],
): Promise<StufeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  if (bereiche.length < 1)
    return { error: "Mindestens eine Sparte muss aktiv bleiben." };

  const { error } = await supabase.rpc("set_berater_bereiche", {
    target: beraterId,
    neue_bereiche: bereiche,
  });
  if (error)
    return {
      error:
        "Speichern fehlgeschlagen — nur die Geschäftsführung darf Sparten zuweisen.",
    };
  revalidatePath("/team");
  return { ok: true };
}

/**
 * Setzt die Monatsziele (eigene Provision) eines Beraters je Sparte —
 * „von oben" (Kunden-Feedback 22.07.): die GF für alle, ein Berater nur für
 * seine DIREKTEN Berater. Kein Selbst-Setzen. Berechtigung erzwingt die
 * SECURITY-DEFINER-Funktion set_monatsziel_fuer in der DB.
 */
export async function setMonatsziele(
  beraterId: string,
  zielImmobilien: number | null,
  zielVv: number | null,
): Promise<StufeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  for (const z of [zielImmobilien, zielVv]) {
    if (z != null && (Number.isNaN(z) || z < 0 || z > 100_000_000))
      return { error: "Ziel muss eine positive Zahl sein." };
  }

  const { error } = await supabase.rpc("set_monatsziel_fuer", {
    p_target: beraterId,
    p_immo: zielImmobilien,
    p_vv: zielVv,
  });
  if (error)
    return {
      error:
        "Speichern fehlgeschlagen — nur die Geschäftsführung oder der direkte Vorgesetzte darf dieses Ziel setzen.",
    };
  revalidatePath("/team");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Setzt die Anbindung eines Beraters (Kap. 1.5/8): Immobilien-Anteil-Default
 * (vorbefüllt in neue Immo-Deals) + übergeordneter Partner (Upline, eine
 * Ebene). Berechtigung + Ebenen-/Zyklusprüfung erzwingt die SECURITY-DEFINER-
 * Funktion set_berater_anbindung in der DB.
 */
export async function setBeraterAnbindung(
  beraterId: string,
  immoDefault: number | null,
  parentId: string | null,
): Promise<StufeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  if (immoDefault != null && (Number.isNaN(immoDefault) || immoDefault < 0 || immoDefault > 100))
    return { error: "Immo-Anteil muss zwischen 0 und 100 liegen." };

  const { error } = await supabase.rpc("set_berater_anbindung", {
    target: beraterId,
    p_immo_default: immoDefault,
    p_parent: parentId,
  });
  if (error)
    return {
      error:
        error.message?.includes("Ebene") || error.message?.includes("Partner")
          ? error.message
          : "Speichern fehlgeschlagen — nur die Geschäftsführung darf die Anbindung ändern.",
    };
  revalidatePath("/team");
  revalidatePath("/dashboard");
  return { ok: true };
}

type Rolle = "berater" | "backoffice" | "finanzierer";

/**
 * Ändert die Rolle zwischen Berater, Backoffice und Finanzierer (2.5).
 *
 * Sicherheit (DSGVO Art. 32): Die Berechtigungsprüfung erzwingt seit
 * Migration 0032 die DATENBANK (`set_berater_rolle`, SECURITY DEFINER) —
 * nicht mehr die App über den Service-Role-Key. Vorher war die App-Prüfung
 * die einzige Hürde: ein Logikfehler dort hätte gereicht, um sich selbst
 * hochzustufen. Der Service-Role-Key umgeht jede RLS und gehört daher nicht
 * in einen Pfad, den ein normaler Nutzer auslösen kann.
 */
export async function setRolle(
  beraterId: string,
  rolle: Rolle,
): Promise<StufeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase.rpc("set_berater_rolle", {
    p_target: beraterId,
    p_rolle: rolle,
  });
  if (error) {
    console.error("setRolle fehlgeschlagen:", error.message);
    return {
      error:
        "Speichern fehlgeschlagen — nur die Geschäftsführung darf Rollen ändern.",
    };
  }

  revalidatePath("/team");
  return { ok: true };
}

/**
 * Leaver-Prozess (DSGVO Art. 32): Zugang eines Mitarbeiters sperren oder
 * wieder freigeben. Sperren entzieht sofort JEDEN Datenzugriff — die RLS
 * prüft `aktiv` (Migration 0032), und die Layouts melden das Konto beim
 * nächsten Aufruf ab.
 *
 * Es werden bewusst KEINE Daten gelöscht: die Kundenakten des Ausgeschiedenen
 * bleiben der Geschäftsführung erhalten (Nachvollziehbarkeit + gesetzliche
 * Aufbewahrungspflichten). Das Löschen von Kundendaten bleibt ein getrennter,
 * bewusster Vorgang.
 */
export async function setBeraterAktiv(
  beraterId: string,
  aktiv: boolean,
): Promise<StufeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase.rpc("set_berater_aktiv", {
    p_target: beraterId,
    p_aktiv: aktiv,
  });
  if (error) {
    console.error("setBeraterAktiv fehlgeschlagen:", error.message);
    return {
      error:
        "Speichern fehlgeschlagen — nur die Geschäftsführung darf Zugänge sperren.",
    };
  }

  revalidatePath("/team");
  return { ok: true };
}

/**
 * Setzt den globalen Immobilien-Provisions-Modus (V4.1 Kap. 1.5, OFFEN #2):
 * Berater-Anteil von der Estera-Provision oder vom Kaufpreis. Berechtigung
 * (nur GF) + Wert-Validierung erzwingt die SECURITY-DEFINER-Funktion
 * set_immo_provision_modus in der DB.
 */
export async function setImmoProvisionModus(
  modus: "anteil_von_provision" | "anteil_von_kaufpreis",
): Promise<StufeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { error } = await supabase.rpc("set_immo_provision_modus", {
    p_modus: modus,
  });
  if (error)
    return {
      error:
        "Speichern fehlgeschlagen — nur die Geschäftsführung darf die Provisionsberechnung ändern.",
    };
  // Betrifft praktisch alle Provisions-/Umsatz-Anzeigen.
  revalidatePath("/team");
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/performance");
  return { ok: true };
}

export type NeuerBeraterInput = {
  vorname: string;
  nachname: string;
  email: string;
  passwort: string;
  stufe: number;
  /** Immo-Anteil-Default (%) — persönlicher Anteil bei Immobilien-Deals (F3). */
  immoAnteil: number;
  bereiche: Bereich[];
  rolle: Rolle;
};

export type NeuerBeraterResult = { ok: true } | { error: string };

/**
 * Legt einen neuen Berater direkt im CRM an (Wunsch C): Auth-Nutzer über die
 * Supabase-Admin-API + Profil mit Stufe und Sparten. Der Service-Role-Key
 * bleibt ausschließlich serverseitig (kein NEXT_PUBLIC-Prefix); die
 * GF-Berechtigung wird VOR jedem Admin-Aufruf über das eigene Profil geprüft.
 */
export async function createBerater(
  input: NeuerBeraterInput,
): Promise<NeuerBeraterResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { data: me } = await supabase
    .from("profiles")
    .select("rolle")
    .eq("id", user.id)
    .single();
  if (me?.rolle !== "geschaeftsfuehrung")
    return { error: "Nur die Geschäftsführung darf Berater anlegen." };

  const vorname = input.vorname.trim();
  const nachname = input.nachname.trim();
  const email = input.email.trim().toLowerCase();
  if (!vorname || !nachname) return { error: "Bitte Vor- und Nachnamen angeben." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Bitte eine gültige E-Mail-Adresse angeben." };
  if (input.passwort.length < 8)
    return { error: "Das Startpasswort braucht mindestens 8 Zeichen." };
  if (Number.isNaN(input.stufe) || input.stufe < 0 || input.stufe > 100)
    return { error: "Stufe muss zwischen 0 und 100 liegen." };
  const immoAnteil =
    Number.isNaN(input.immoAnteil) || input.immoAnteil < 0
      ? null
      : Math.min(input.immoAnteil, 100);
  if (input.bereiche.length < 1)
    return { error: "Mindestens eine Sparte auswählen." };

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url)
    return {
      error:
        "Server nicht konfiguriert (SUPABASE_SERVICE_ROLE_KEY fehlt in der Umgebung).",
    };

  const admin = createSupabaseAdmin<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password: input.passwort,
    email_confirm: true,
  });
  if (authError || !created?.user) {
    return {
      error: authError?.message?.includes("already")
        ? "Für diese E-Mail existiert bereits ein Zugang."
        : "Anlegen fehlgeschlagen. Prüfe die Eingaben und versuche es erneut.",
    };
  }

  const rolle: Rolle =
    input.rolle === "backoffice"
      ? "backoffice"
      : input.rolle === "finanzierer"
        ? "finanzierer"
        : "berater";
  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    vorname,
    nachname,
    rolle,
    aktiv: true,
    vertriebler_stufe: input.stufe,
    immo_anteil_default: immoAnteil,
    bereich: input.bereiche,
    // Kaskade-Prinzip (Kundenantwort Call SJ): wer anlegt, wird Upline —
    // neue Berater hängen als Downline unter dem Anleger (hier: der GF).
    // In der Team-Verwaltung jederzeit änderbar (Übergeordneter Partner).
    parent_berater_id: rolle === "berater" ? user.id : null,
  });
  if (profileError) {
    // Auth-Nutzer nicht verwaist zurücklassen.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Profil konnte nicht angelegt werden. Bitte erneut versuchen." };
  }

  await begruessungHinweis(supabase, created.user.id, user.id);
  revalidatePath("/team");
  return { ok: true };
}

export type TippgeberInput = {
  name: string;
  ownerId: string;
  provisionSatz: number | null;
  bereiche: Bereich[];
};

/**
 * Legt einen Tippgeber an (Struktur-Kern, F6): leichter Eintrag ohne Login,
 * hängt unter owner_id. RLS erzwingt die Berechtigung — die GF darf jeden
 * owner setzen, ein Berater nur sich selbst.
 */
export async function createTippgeber(
  input: TippgeberInput,
): Promise<StufeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const name = input.name.trim();
  if (!name) return { error: "Bitte einen Namen angeben." };
  if (!input.ownerId) return { error: "Bitte den zugehörigen Berater wählen." };
  if (
    input.provisionSatz != null &&
    (Number.isNaN(input.provisionSatz) ||
      input.provisionSatz < 0 ||
      input.provisionSatz > 100)
  )
    return { error: "Provisionssatz muss zwischen 0 und 100 liegen." };
  if (input.bereiche.length < 1)
    return { error: "Mindestens eine Sparte auswählen." };

  const { error } = await supabase.from("tippgeber").insert({
    name,
    owner_id: input.ownerId,
    provision_satz: input.provisionSatz,
    bereiche: input.bereiche,
  });
  if (error)
    return {
      error:
        "Anlegen fehlgeschlagen — erlaubt sind nur eigene Tippgeber (bzw. GF für alle).",
    };
  revalidatePath("/team");
  return { ok: true };
}

export type SubBeraterInput = {
  vorname: string;
  nachname: string;
  email: string;
  passwort: string;
  stufe: number;
  immoAnteil: number;
  bereiche: Bereich[];
};

/**
 * Berater-Self-Service (Call SJ F5/3.8): ein Berater legt einen Unter-Berater
 * (mit Login) an, der UNTER ihm hängt (parent_berater_id = Aufrufer). Nutzt
 * den Admin-Client serverseitig; der übergeordnete Partner wird zwingend auf
 * den Aufrufer gesetzt — ein Berater kann nur die eigene Downline aufbauen.
 */
export async function createSubBerater(
  input: SubBeraterInput,
): Promise<NeuerBeraterResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { data: me } = await supabase
    .from("profiles")
    .select("rolle, immo_anteil_default, vertriebler_stufe")
    .eq("id", user.id)
    .single();
  if (me?.rolle === "backoffice")
    return { error: "Backoffice darf keine Berater anlegen." };
  // Ein Berater darf seiner Downline NIEMALS mehr Provision vergeben, als er
  // selbst hat (Kunden-Feedback 22.07.). Ohne eigenen Satz (null) = 0 → er kann
  // keinen Immobilien-Provisionsanteil vergeben, bis die GF ihm einen zuweist.
  const maxProvision =
    me?.immo_anteil_default != null ? Number(me.immo_anteil_default) : 0;
  const maxStufe =
    me?.vertriebler_stufe != null ? Number(me.vertriebler_stufe) : 0;

  const vorname = input.vorname.trim();
  const nachname = input.nachname.trim();
  const email = input.email.trim().toLowerCase();
  if (!vorname || !nachname) return { error: "Bitte Vor- und Nachnamen angeben." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Bitte eine gültige E-Mail-Adresse angeben." };
  if (input.passwort.length < 8)
    return { error: "Das Startpasswort braucht mindestens 8 Zeichen." };
  if (Number.isNaN(input.stufe) || input.stufe < 0 || input.stufe > maxStufe)
    // Bewusst OHNE die konkrete Obergrenze: die Meldung darf die eigene
    // Stufe der Upline nicht verraten (Wunsch Mandant 30.07.).
    return {
      error: "Die Stufe darf deine eigene Stufe nicht überschreiten.",
    };
  if (input.bereiche.length < 1)
    return { error: "Mindestens eine Sparte auswählen." };
  // Provisionsanteil nur relevant, wenn die Immobilien-Sparte gewählt ist.
  // Echte Grenze (max. eigener Satz) mit Fehler-Return statt stillem Cappen,
  // damit ein direkter Call den Slider nicht umgeht (Call SJ Fine-Tuning).
  let immoAnteil: number | null = null;
  if (input.bereiche.includes("immobilien")) {
    if (maxProvision < 1)
      return {
        error:
          "Für dich ist noch kein Provisionsanteil hinterlegt — die Geschäftsführung muss dir zuerst einen Satz zuweisen, bevor du Immobilien-Berater anlegen kannst.",
      };
    if (
      Number.isNaN(input.immoAnteil) ||
      input.immoAnteil < 1 ||
      input.immoAnteil > maxProvision
    )
      return {
        error: `Provisionsanteil muss zwischen 1 und ${maxProvision} % liegen (dein eigener Satz).`,
      };
    immoAnteil = input.immoAnteil;
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url)
    return { error: "Server nicht konfiguriert (Service-Role-Key fehlt)." };

  const admin = createSupabaseAdmin<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password: input.passwort,
    email_confirm: true,
  });
  if (authError || !created?.user) {
    return {
      error: authError?.message?.includes("already")
        ? "Für diese E-Mail existiert bereits ein Zugang."
        : "Anlegen fehlgeschlagen. Prüfe die Eingaben und versuche es erneut.",
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    vorname,
    nachname,
    rolle: "berater",
    aktiv: true,
    vertriebler_stufe: input.stufe,
    immo_anteil_default: immoAnteil,
    bereich: input.bereiche,
    parent_berater_id: user.id, // hängt unter dem Aufrufer
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Profil konnte nicht angelegt werden. Bitte erneut versuchen." };
  }

  await begruessungHinweis(supabase, created.user.id, user.id);
  revalidatePath("/partner");
  revalidatePath("/team");
  return { ok: true };
}

/** Löscht einen Tippgeber (RLS: GF oder Besitzer). */
/**
 * Löscht einen Berater-Zugang endgültig (nur GF).
 *
 * Zweistufig: Hängen Kunden, Deals, Aufgaben oder Tippgeber am Profil, gibt
 * der erste Aufruf `rueckfrage` zurück — die Oberfläche listet auf, was
 * mitgelöscht würde, und ruft nach Bestätigung mit `force = true` erneut auf.
 *
 * Beim erzwungenen Löschen werden die EIGENEN Daten entfernt (Kunden samt
 * Deals, Dokumenten, Notizen, Aufgaben und Storage-Dateien). Spuren auf
 * Kunden ANDERER Berater — Notizen, hochgeladene Dokumente, Stage-Historie —
 * bleiben dagegen erhalten; dort wird nur der Urheber-Verweis geleert. Sonst
 * würde das Löschen eines Zugangs die Historie fremder Deals zerstören, auf
 * der Deal-Time und Konversionsraten beruhen.
 */
export type DeleteBeraterResult =
  | { ok: true }
  | { error: string }
  /** Es hängen Daten dran — die GF muss ausdrücklich bestätigen. */
  | { rueckfrage: string };

export async function deleteBerater(
  id: string,
  force = false,
): Promise<DeleteBeraterResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };

  const { data: me } = await supabase
    .from("profiles")
    .select("rolle")
    .eq("id", user.id)
    .single();
  if (me?.rolle !== "geschaeftsfuehrung")
    return { error: "Nur die Geschäftsführung darf Zugänge löschen." };
  if (id === user.id)
    return { error: "Du kannst deinen eigenen Zugang nicht löschen." };

  const { data: ziel } = await supabase
    .from("profiles")
    .select("vorname, nachname, rolle")
    .eq("id", id)
    .single();
  if (!ziel) return { error: "Zugang nicht gefunden." };
  if (ziel.rolle === "geschaeftsfuehrung")
    return {
      error:
        "Geschäftsführungs-Zugänge können nicht gelöscht werden. Bitte stattdessen auf inaktiv setzen.",
    };

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url)
    return { error: "Server nicht konfiguriert (Service-Role-Key fehlt)." };
  const admin = createSupabaseAdmin<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Was am Profil hängt — jeweils nur zählen, nichts anfassen.
  // BEWUSST über den Admin-Client: mit dem RLS-Client käme je nach Policy 0
  // heraus, die Rückfrage bliebe aus und das harte Löschen liefe in einen
  // Fremdschlüssel-Fehler. Dass nur die GF hier ankommt, ist oben geprüft.
  const zaehle = async (
    tabelle: "contacts" | "deals" | "tasks" | "tippgeber" | "profiles",
    spalte: string,
  ) => {
    const { count } = await admin
      .from(tabelle)
      .select("id", { count: "exact", head: true })
      .eq(spalte, id);
    return count ?? 0;
  };
  const [kunden, deals, aufgaben, tippgeber, downline] = await Promise.all([
    zaehle("contacts", "berater_id"),
    zaehle("deals", "berater_id"),
    zaehle("tasks", "owner_id"),
    zaehle("tippgeber", "owner_id"),
    zaehle("profiles", "parent_berater_id"),
  ]);

  const posten: string[] = [];
  if (kunden > 0)
    posten.push(`${kunden} Kunde${kunden === 1 ? "" : "n"} (mit allen Deals, Dokumenten, Notizen und Aufgaben dazu)`);
  if (deals > 0) posten.push(`${deals} Deal${deals === 1 ? "" : "s"}`);
  if (aufgaben > 0)
    posten.push(`${aufgaben} Aufgabe${aufgaben === 1 ? "" : "n"}`);
  if (tippgeber > 0) posten.push(`${tippgeber} Tippgeber`);

  // Erster Klick bei vorhandenen Daten: nicht löschen, sondern zurückfragen.
  if (posten.length > 0 && !force) {
    const anhang =
      downline > 0
        ? downline === 1
          ? "\n\n1 untergeordneter Berater bleibt bestehen und hängt danach direkt unter der Geschäftsführung."
          : `\n\n${downline} untergeordnete Berater bleiben bestehen und hängen danach direkt unter der Geschäftsführung.`
        : "";
    return {
      rueckfrage:
        `${ziel.vorname} ${ziel.nachname} hat noch:\n\n• ${posten.join("\n• ")}\n\n` +
        `Diese Daten werden UNWIDERRUFLICH mitgelöscht.${anhang}\n\n` +
        `Wirklich löschen?`,
    };
  }

  if (posten.length > 0) {
    // --- Eigene Daten des Beraters entfernen -------------------------------
    // Dateien im Storage zuerst: die DB-Zeilen verschwinden gleich per
    // Cascade, danach waeren die Dateien nicht mehr auffindbar.
    const { data: eigeneKunden } = await admin
      .from("contacts")
      .select("id")
      .eq("berater_id", id);
    const kundenIds = (eigeneKunden ?? []).map((k) => k.id);
    if (kundenIds.length > 0) {
      const { data: dateien } = await admin
        .from("contact_documents")
        .select("storage_path")
        .in("contact_id", kundenIds);
      const pfade = (dateien ?? [])
        .map((d) => d.storage_path)
        .filter((p): p is string => !!p);
      for (let i = 0; i < pfade.length; i += 100) {
        await admin.storage
          .from("kundendokumente")
          .remove(pfade.slice(i, i + 100));
      }
      // Kunden loeschen — Deals, Dokumente, Notizen, Aufgaben und der
      // Checklisten-Status haengen per ON DELETE CASCADE daran.
      for (let i = 0; i < kundenIds.length; i += 100) {
        await admin
          .from("contacts")
          .delete()
          .in("id", kundenIds.slice(i, i + 100));
      }
    }
    // Deals auf fremden Kunden (Stage-Historie haengt per Cascade daran).
    await admin.from("deals").delete().eq("berater_id", id);
    // Aufgaben: owner_id ist NOT NULL -> loeschen. Zuweisungen an ihn
    // dagegen nur loesen, die Aufgabe selbst gehoert jemand anderem.
    await admin.from("tasks").delete().eq("owner_id", id);
    await admin.from("tasks").update({ assigned_to: null }).eq("assigned_to", id);
    await admin.from("tippgeber").delete().eq("owner_id", id);

    // --- Spuren auf FREMDEN Daten nur entkoppeln, nicht loeschen -----------
    // Notizen, Dokumente und Stage-Historie auf Kunden ANDERER Berater
    // bleiben erhalten; nur der Urheber-Verweis wird geleert. Die
    // Stage-Historie ist Grundlage fuer Deal-Time und Konversionsraten
    // (Projektregel) — sie darf nicht verschwinden, nur weil jemand geht.
    await admin
      .from("contact_activities")
      .update({ created_by: null })
      .eq("created_by", id);
    await admin
      .from("contact_documents")
      .update({ uploaded_by: null })
      .eq("uploaded_by", id);
    await admin
      .from("deal_stage_history")
      .update({ changed_by: null })
      .eq("changed_by", id);
    await admin
      .from("portal_documents")
      .update({ uploaded_by: null })
      .eq("uploaded_by", id);
  }

  // Der Auth-Nutzer ist die Wurzel: das Profil haengt per ON DELETE CASCADE
  // daran und verschwindet mit. Die Downline wird per SET NULL elternlos und
  // erscheint dadurch direkt unter der Geschaeftsfuehrung.
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) return { error: "Löschen fehlgeschlagen. Bitte erneut versuchen." };

  revalidatePath("/team");
  revalidatePath("/dashboard");
  revalidatePath("/kontakte");
  revalidatePath("/partner");
  return { ok: true };
}

export async function deleteTippgeber(id: string): Promise<StufeResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  const { error } = await supabase.from("tippgeber").delete().eq("id", id);
  if (error) return { error: "Löschen fehlgeschlagen." };
  revalidatePath("/team");
  return { ok: true };
}
