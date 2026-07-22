"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ClipboardList,
  FileText,
  Trash2,
} from "lucide-react";
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
  const [offen, setOffen] = useState<string | null>(null);

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
        // Kopf (immer sichtbar, z. B. „Von X · fällig …") und optionale
        // Beschreibung (per Dropdown aufklappbar) — getrennt durch Leerzeile.
        const [kopf, ...rest] = (n.text ?? "").split("\n\n");
        const beschreibung = rest.join("\n\n").trim();
        const auf = offen === n.id;
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
                {n.link ? (
                  <button
                    type="button"
                    onClick={() => router.push(n.link as string)}
                    className="block text-left text-sm font-medium text-foreground hover:underline"
                  >
                    {n.titel}
                  </button>
                ) : (
                  <p className="text-sm font-medium text-foreground">{n.titel}</p>
                )}
                {kopf && (
                  <p className="mt-0.5 text-sm text-muted-foreground">{kopf}</p>
                )}
                {beschreibung && (
                  <button
                    type="button"
                    onClick={() => setOffen((v) => (v === n.id ? null : n.id))}
                    aria-expanded={auf}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 transition-transform", auf && "rotate-180")}
                    />
                    Beschreibung {auf ? "ausblenden" : "anzeigen"}
                  </button>
                )}
                {beschreibung && auf && (
                  <p className="mt-1 whitespace-pre-wrap rounded-md bg-surface-2/60 px-3 py-2 text-sm text-muted-foreground">
                    {beschreibung}
                  </p>
                )}
                <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                  {formatDate(n.created_at)}
                </p>
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
