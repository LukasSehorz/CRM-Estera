"use client";

import "./globals.css";

/**
 * Letzte Auffanglinie: Fehler im Root-Layout selbst. Ersetzt das gesamte
 * Dokument, daher eigenes <html>/<body> und bewusst minimal gehalten.
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="de" className="dark">
      <body className="antialiased">
        <main className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="flex max-w-md flex-col items-center gap-4 text-center">
            <h1 className="text-xl font-semibold text-foreground">
              Da ist etwas schiefgelaufen
            </h1>
            <p className="text-sm text-muted-foreground">
              Die Anwendung konnte nicht geladen werden. Versuche es erneut.
            </p>
            <button
              onClick={reset}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
            >
              Erneut versuchen
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
