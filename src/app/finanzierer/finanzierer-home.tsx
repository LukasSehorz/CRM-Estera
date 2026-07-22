"use client";

import { useState } from "react";
import { Bell, ClipboardList, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { FinanziererView, type FinKunde } from "./finanzierer-view";
import { FinanziererAufgaben, type FinTask } from "./finanzierer-aufgaben";
import {
  BenachrichtigungenListe,
  type NotificationItem,
} from "@/app/(dashboard)/benachrichtigungen/benachrichtigungen-list";

type Tab = "dokumente" | "aufgaben" | "benachrichtigungen";

export function FinanziererHome({
  kunden,
  aufgaben,
  benachrichtigungen,
}: {
  kunden: FinKunde[];
  aufgaben: FinTask[];
  benachrichtigungen: NotificationItem[];
}) {
  const [tab, setTab] = useState<Tab>("dokumente");
  const offeneAufgaben = aufgaben.filter((a) => !a.erledigt).length;
  const ungelesen = benachrichtigungen.filter((n) => !n.gelesen).length;

  const tabs: {
    key: Tab;
    label: string;
    icon: typeof FolderOpen;
    badge?: number;
  }[] = [
    { key: "dokumente", label: "Dokumente", icon: FolderOpen },
    { key: "aufgaben", label: "Aufgaben", icon: ClipboardList, badge: offeneAufgaben },
    {
      key: "benachrichtigungen",
      label: "Benachrichtigungen",
      icon: Bell,
      badge: ungelesen,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 border-b border-border">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.badge ? (
                <span className="min-w-5 rounded-full bg-danger px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none text-white tabular-nums">
                  {t.badge > 99 ? "99+" : t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "dokumente" && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Freigegebene Dokumente
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Kunden und Dokumente, die für Sie freigeschaltet wurden. Zum
              Ansehen einen Kunden aufklappen.
            </p>
          </div>
          <FinanziererView kunden={kunden} />
        </div>
      )}

      {tab === "aufgaben" && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Aufgaben</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Ihnen zugewiesene Aufgaben — zum Erledigen abhaken.
            </p>
          </div>
          <FinanziererAufgaben aufgaben={aufgaben} />
        </div>
      )}

      {tab === "benachrichtigungen" && (
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              Benachrichtigungen
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Zugewiesene Aufgaben und Dokument-Freigaben.
            </p>
          </div>
          <BenachrichtigungenListe items={benachrichtigungen} />
        </div>
      )}
    </div>
  );
}
