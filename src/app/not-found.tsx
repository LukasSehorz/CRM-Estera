import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { Button } from "@/components/ui/button";

/** Globale 404 (außerhalb der App-Shell, z. B. falsche URL vor dem Login). */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <BrandMark className="h-14 w-14 rounded-2xl" />
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Seite nicht gefunden
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Die aufgerufene Seite existiert nicht.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard">Zur Startseite</Link>
        </Button>
      </div>
    </main>
  );
}
