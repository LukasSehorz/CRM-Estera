"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { toggleTask } from "@/app/(dashboard)/kontakte/actions";
import { Checkbox } from "@/components/ui/checkbox";

/** Abhakbare Aufgabe im „Heute"-Block. */
export function HeuteTaskItem({
  id,
  titel,
  faelligAm,
  ueberfaellig,
  kontaktName,
  kontaktId,
}: {
  id: string;
  titel: string;
  faelligAm: string | null;
  ueberfaellig: boolean;
  kontaktName: string | null;
  kontaktId: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function erledigen(checked: boolean) {
    start(async () => {
      const res = await toggleTask(id, checked, kontaktId);
      if ("error" in res) toast.error(res.error);
      else router.refresh();
    });
  }

  return (
    // Grid mit minmax(0,1fr): der Titel MUSS schrumpfen (Ellipsis), das
    // Fälligkeits-Chip bleibt sicher innerhalb der Karte.
    <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 py-1 text-sm">
      <Checkbox
        checked={false}
        disabled={pending}
        onCheckedChange={(c) => erledigen(c === true)}
      />
      <span className="truncate">
        {titel}
        {kontaktName && kontaktId && (
          <>
            {" · "}
            <Link
              href={`/kontakte/${kontaktId}`}
              className="text-primary hover:underline"
            >
              {kontaktName}
            </Link>
          </>
        )}
      </span>
      {faelligAm && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            ueberfaellig
              ? "bg-danger/15 text-danger"
              : "bg-secondary text-muted-foreground",
          )}
        >
          {formatDate(faelligAm)}
        </span>
      )}
    </li>
  );
}
