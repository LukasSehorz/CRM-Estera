"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Alle eigenen Benachrichtigungen als gelesen markieren. */
export async function markAllNotificationsRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("notifications")
    .update({ gelesen: true })
    .eq("empfaenger_id", user.id)
    .eq("gelesen", false);
  revalidatePath("/benachrichtigungen");
}

/** Eine Benachrichtigung löschen (nur eigene, per RLS erzwungen). */
export async function deleteNotification(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("notifications").delete().eq("id", id);
  revalidatePath("/benachrichtigungen");
}
