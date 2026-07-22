"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, ClipboardList, FileText, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { markAllNotificationsRead, deleteNotification } from "./actions";

export type NotificationItem = {
  id: string;
  typ: string;
  titel: string;
  text: string | null;
  link: string | null;
  gelesen: boolean;
  created_at: string;
};

function IconFor({ typ }: { typ: string }) {
  const C = typ === "aufgabe" ? ClipboardList : typ === "dokument" ? FileText : Bell;
  return <C className="h-4 w-4" aria-hidden />;
}

export function BenachrichtigungenListe({ items }: { items: NotificationItem[] }) {
  const router = useRouter();
  const [, start] = useTransition();

  // Beim Öffnen alles als gelesen markieren — der Zähler in der Navigation
  // leert sich bei der nächsten Navigation. Die Hervorhebung bleibt in dieser
  // Ansicht sichtbar, damit man die neuen Einträge noch erkennt.
  useEffect(() => {
    if (items.some((i) => !i.gelesen)) void markAllNotificationsRead();
    // absichtlich nur beim Mounten
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-10 text-center">
        <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Keine Benachrichtigungen.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {items.map((n) => {
        const inner = (
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg",
                n.typ === "aufgabe"
                  ? "bg-primary/10 text-primary"
                  : n.typ === "dokument"
                    ? "bg-info/10 text-info"
                    : "bg-surface-2 text-muted-foreground",
              )}
            >
              <IconFor typ={n.typ} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{n.titel}</p>
              {n.text && (
                <p className="mt-0.5 text-sm text-muted-foreground">{n.text}</p>
              )}
              <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                {formatDate(n.created_at)}
              </p>
            </div>
          </div>
        );
        return (
          <li
            key={n.id}
            className={cn(
              "group relative rounded-xl border bg-surface p-3 transition-colors",
              n.gelesen
                ? "border-border"
                : "border-primary/40 bg-primary/[0.03]",
            )}
          >
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                {n.link ? (
                  <button
                    type="button"
                    onClick={() => router.push(n.link as string)}
                    className="block w-full text-left"
                  >
                    {inner}
                  </button>
                ) : (
                  inner
                )}
              </div>
              <button
                type="button"
                aria-label="Benachrichtigung löschen"
                onClick={() =>
                  start(async () => {
                    await deleteNotification(n.id);
                    router.refresh();
                  })
                }
                className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
