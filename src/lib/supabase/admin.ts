import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Supabase-Client mit Service-Role (umgeht RLS). NUR für serverseitige
 * Abläufe ohne angemeldeten Nutzer, z. B. den Empfang von Meta-Leads.
 * Niemals in Client-Komponenten importieren (der Schlüssel hat kein
 * NEXT_PUBLIC_-Präfix und wäre dort ohnehin leer).
 */
export function createAdminClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY oder NEXT_PUBLIC_SUPABASE_URL fehlt.");
  }
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
