"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  Zap,
} from "lucide-react";
import { ACTIVITY_TYPEN } from "@/config/enums";
import { formatDateTime } from "@/lib/format";
import { addActivity } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type ActivityRow = {
  id: string;
  typ: "anruf" | "mail" | "whatsapp" | "notiz" | "system";
  text: string;
  created_at: string;
  created_by_name: string | null;
};

const ICON: Record<ActivityRow["typ"], React.ComponentType<{ className?: string }>> = {
  anruf: Phone,
  mail: Mail,
  whatsapp: MessageCircle,
  notiz: StickyNote,
  system: Zap,
};

/**
 * Activity-Timeline der Akte (Schleife 2, 3.5): chronologische Historie —
 * automatische Systemeinträge + manuelle Einträge (Anruf/Mail/WhatsApp/Notiz).
 */
export function ContactTimeline({
  contactId,
  activities,
}: {
  contactId: string;
  activities: ActivityRow[];
}) {
  const router = useRouter();
  const [typ, setTyp] = useState<(typeof ACTIVITY_TYPEN)[number]["value"]>("anruf");
  const [text, setText] = useState("");
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    start(async () => {
      const res = await addActivity(contactId, typ, text);
      if ("error" in res) {
        toast.error(res.error);
        return;
      }
      setText("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <h2 className="text-base font-semibold">Timeline</h2>
      <p className="text-xs text-muted-foreground">
        Alles zu diesem Kunden — automatisch protokolliert plus eigene Einträge.
      </p>

      <form onSubmit={submit} className="mt-3 flex items-center gap-2">
        <Select value={typ} onValueChange={(v) => setTyp(v as typeof typ)}>
          <SelectTrigger className="w-32 shrink-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {ACTIVITY_TYPEN.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Was ist passiert? (z. B. Rückruf vereinbart)"
        />
        <Button type="submit" disabled={pending || !text.trim()}>
          Eintragen
        </Button>
      </form>

      {activities.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Noch keine Einträge — der erste Statuswechsel erscheint automatisch.
        </p>
      ) : (
        <ol className="mt-4 space-y-0">
          {activities.map((a, i) => {
            const Icon = ICON[a.typ];
            return (
              <li key={a.id} className="relative flex gap-3 pb-4">
                {i < activities.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-px bg-border"
                  />
                )}
                <span
                  className={
                    a.typ === "system"
                      ? "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground"
                      : "grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-sm text-foreground">{a.text}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(a.created_at)}
                    {a.created_by_name ? ` · ${a.created_by_name}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
