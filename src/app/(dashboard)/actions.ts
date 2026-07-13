"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export type ZielResult = { ok: true } | { error: string };

/**
 * Berater setzt sein eigenes Monatsziel (15.2). Die Berechtigung + die
 * GF-Sperre erzwingt die SECURITY-DEFINER-Funktion set_eigenes_monatsziel
 * in der DB; hier zusätzlich Basis-Validierung. Beträge = eigene Provision.
 */
export async function setEigenesMonatsziel(
  zielImmobilien: number | null,
  zielVv: number | null,
): Promise<ZielResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Nicht angemeldet." };
  for (const z of [zielImmobilien, zielVv]) {
    if (z != null && (Number.isNaN(z) || z < 0 || z > 100_000_000))
      return { error: "Ziel muss eine positive Zahl sein." };
  }

  const { error } = await supabase.rpc("set_eigenes_monatsziel", {
    p_immo: zielImmobilien,
    p_vv: zielVv,
  });
  if (error)
    return {
      error: error.message?.includes("gesperrt")
        ? "Dein Monatsziel wurde von der Geschäftsführung festgelegt und ist gesperrt."
        : "Speichern fehlgeschlagen. Bitte erneut versuchen.",
    };
  revalidatePath("/dashboard");
  return { ok: true };
}
