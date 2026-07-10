"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error: string } | null;

/**
 * Anmeldung per E-Mail/Passwort. Kein Self-Signup — Accounts werden von der
 * Geschäftsführung/Admin angelegt.
 */
export async function login(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Bitte E-Mail und Passwort eingeben." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "E-Mail oder Passwort ist falsch." };
  }

  // redirect() wirft intern — bewusst außerhalb eines try/catch.
  redirect("/dashboard");
}
