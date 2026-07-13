"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Bereich = Database["public"]["Enums"]["bereich_enum"];

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
 * von der GF gemeinsam mit dem Berater festgelegt (Schleife 3, Ber. 2).
 * Berechtigung erzwingt die RLS der Tabelle berater_monatsziele (nur GF
 * schreibt); hier zusätzlich Basis-Validierung.
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

  const { error } = await supabase.from("berater_monatsziele").upsert({
    berater_id: beraterId,
    monatsziel_immobilien: zielImmobilien,
    monatsziel_vv: zielVv,
    updated_at: new Date().toISOString(),
  });
  if (error)
    return {
      error:
        "Speichern fehlgeschlagen — nur die Geschäftsführung darf Monatsziele setzen.",
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

type Rolle = "berater" | "backoffice";

/**
 * Ändert die Rolle zwischen Berater und Backoffice (2.5). Nutzt den Admin-
 * Client (Service-Role, serverseitig) nach GF-Prüfung — die GF-Rolle selbst
 * wird nie über diese Funktion vergeben oder entzogen.
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
  const { data: me } = await supabase
    .from("profiles")
    .select("rolle")
    .eq("id", user.id)
    .single();
  if (me?.rolle !== "geschaeftsfuehrung")
    return { error: "Nur die Geschäftsführung darf Rollen ändern." };

  // Ziel darf nicht die GF sein (GF-Rolle bleibt unangetastet).
  const { data: ziel } = await supabase
    .from("profiles")
    .select("rolle")
    .eq("id", beraterId)
    .single();
  if (ziel?.rolle === "geschaeftsfuehrung")
    return { error: "Die Geschäftsführungs-Rolle kann hier nicht geändert werden." };

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!serviceKey || !url)
    return { error: "Server nicht konfiguriert (Service-Role-Key fehlt)." };

  const admin = createSupabaseAdmin<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await admin
    .from("profiles")
    .update({ rolle })
    .eq("id", beraterId);
  if (error) return { error: "Speichern fehlgeschlagen. Bitte erneut versuchen." };

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

  const rolle: Rolle = input.rolle === "backoffice" ? "backoffice" : "berater";
  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    vorname,
    nachname,
    rolle,
    aktiv: true,
    vertriebler_stufe: input.stufe,
    bereich: input.bereiche,
  });
  if (profileError) {
    // Auth-Nutzer nicht verwaist zurücklassen.
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: "Profil konnte nicht angelegt werden. Bitte erneut versuchen." };
  }

  revalidatePath("/team");
  return { ok: true };
}
