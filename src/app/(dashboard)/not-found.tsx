import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * 404 innerhalb der App-Shell. Greift auch, wenn ein Datensatz per RLS nicht
 * sichtbar ist — deshalb bewusst „existiert nicht oder kein Zugriff".
 */
export default function DashboardNotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <SearchX className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-semibold">Nicht gefunden</h1>
        <p className="text-sm text-muted-foreground">
          Dieser Eintrag existiert nicht oder du hast keinen Zugriff darauf.
        </p>
        <Button asChild className="mt-2">
          <Link href="/dashboard">Zurück zum Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
