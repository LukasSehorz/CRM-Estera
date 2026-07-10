"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Fehler-Boundary für den geschützten Bereich: fängt Renderfehler ab, ohne
 * die Sidebar zu verlieren. Sachliche Meldung + erneuter Versuch.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Für die Fehlersuche in der Konsole — keine Nutzerdaten im UI.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-16">
      <div className="flex max-w-md flex-col items-center gap-3 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-semibold">Da ist etwas schiefgelaufen</h1>
        <p className="text-sm text-muted-foreground">
          Die Seite konnte nicht geladen werden. Prüfe deine Verbindung und
          versuche es erneut.
          {error.digest && (
            <span className="mt-1 block text-xs">
              Fehlercode: {error.digest}
            </span>
          )}
        </p>
        <Button onClick={reset} className="mt-2">
          <RotateCcw className="mr-1 h-4 w-4" />
          Erneut versuchen
        </Button>
      </div>
    </div>
  );
}
