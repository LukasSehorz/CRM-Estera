"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Hinweis: Berater setzen ihr Monatsziel NICHT mehr selbst (Kunden-Feedback
// 22.07.). Ziele setzt die GF bzw. der direkte Vorgesetzte über die
// Team-Verwaltung (setMonatsziele → RPC set_monatsziel_fuer).
