"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { login, type LoginState } from "./actions";
import { BrandMark } from "@/components/layout/brand-mark";
import { BRANDING } from "@/config/branding";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Anmeldung — Redesign Schleife 3 (Punkt 1): Premium-Split-Screen.
 * Links das Marken-Panel (erzwungenes Navy-Dark, Gold nur als Hauch),
 * rechts die ruhige Anmelde-Karte. Farben ausschließlich über Tokens,
 * Gold-CTA = die eine Hauptaktion der Ansicht (Design-System §5).
 */
export default function LoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    login,
    null,
  );
  const jahr = new Date().getFullYear();

  // Login bewusst IMMER dunkel — auch wenn der User den Hellmodus nutzt: die
  // Klasse "dark" auf dem Wurzelelement erzwingt die Dark-Tokens für die ganze
  // Seite (sonst mischen sich Navy-Panel links und helle Karte rechts).
  return (
    <main className="dark grid min-h-screen bg-background text-foreground lg:grid-cols-2">
      <section
        className="relative hidden overflow-hidden bg-background text-foreground lg:flex lg:flex-col lg:justify-between lg:p-10"
        aria-label="Estera"
      >
        {/* Hintergrund: bewusst pur — nur die Navy-Fläche (--background),
            identisch zur rechten Hälfte. Kein Foto, keine Ringe, kein Gold,
            keine Trennlinie. */}

        {/* Marke groß und mittig: Logo, darunter Firmenname, darunter der
            zentrierte Claim. */}
        <div className="relative flex flex-1 flex-col items-center justify-center text-center">
          <div
            className="animate-in fade-in slide-in-from-bottom-2"
            style={{ animationDuration: "700ms" }}
          >
            {/* Wortmarke „ESTERA" (Off-White) — liegt direkt auf der Navy-Fläche. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={BRANDING.wordmarkLightSrc}
              alt={BRANDING.company}
              className="h-20 w-auto sm:h-24"
              style={{ filter: "drop-shadow(0 12px 24px rgba(0, 0, 0, 0.45))" }}
            />
          </div>
          <div
            className="mt-6 text-3xl font-semibold tracking-tight animate-in fade-in slide-in-from-bottom-2"
            style={{
              animationDuration: "700ms",
              animationDelay: "100ms",
              animationFillMode: "backwards",
            }}
          >
            Estera GmbH
          </div>
          <h1
            className="mt-8 text-4xl font-semibold leading-tight tracking-tight animate-in fade-in slide-in-from-bottom-2"
            style={{
              animationDuration: "700ms",
              animationDelay: "150ms",
              animationFillMode: "backwards",
            }}
          >
            Vermögen mit{" "}
            <span className="text-gold-contrast">Substanz</span>.
          </h1>
          <p
            className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground animate-in fade-in slide-in-from-bottom-2"
            style={{
              animationDuration: "700ms",
              animationDelay: "300ms",
              animationFillMode: "backwards",
            }}
          >
            Leads, Pipelines, Finanzierung und Berater-Performance — das
            interne Vertriebs-CRM der Estera GmbH, an einem Ort.
          </p>
          <div
            className="mt-6 flex items-center justify-center gap-4 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-2"
            style={{
              animationDuration: "700ms",
              animationDelay: "450ms",
              animationFillMode: "backwards",
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: "var(--gold)" }}
                aria-hidden
              />
              Immobilien
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: "var(--stage-1)" }}
                aria-hidden
              />
              Vermögensverwaltung
            </span>
          </div>
        </div>

        <p className="relative text-xs text-muted-foreground">
          © {jahr} Estera GmbH · Interner Zugang
        </p>
      </section>

      {/* Anmelde-Seite */}
      <section className="flex items-center justify-center overflow-x-clip p-6">
        <div
          className="relative w-full max-w-sm animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDuration: "500ms" }}
        >
          {/* Berater-Porträts: reine Deko. Liegen hinter der Karte (z-0 vs.
              z-10), Köpfe auf Höhe der Marke, Körper laufen seitlich hinter
              die Karte. Auf schmalen Screens ausgeblendet. */}
          {/* Links: generiertes Video (Person läuft ein und verschränkt die
              Arme). Hintergrundfarbe identisch mit der Seite (#0A121E),
              bleibt nach einmaligem Abspielen auf dem letzten Frame stehen. */}
          <video
            src="/login/berater-links.mp4"
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-hidden
            className="pointer-events-none absolute -left-[228px] top-[-6px] z-0 hidden lg:top-[-158px] h-[470px] w-auto select-none md:block"
            style={{
              // Ränder weich auslaufen lassen, damit die Videokante
              // unsichtbar mit dem Seiten-Hintergrund verschmilzt.
              maskImage:
                "linear-gradient(to bottom, transparent 0, black 28px, black 78%, transparent 100%), linear-gradient(to right, transparent 64px, black 128px, black calc(100% - 40px), transparent 100%)",
              maskComposite: "intersect",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0, black 28px, black 78%, transparent 100%), linear-gradient(to right, transparent 64px, black 128px, black calc(100% - 40px), transparent 100%)",
              WebkitMaskComposite: "source-in",
            }}
          />
          {/* Rechts: generiertes Video, gleiche Machart wie links —
              gespiegelte Randmasken. */}
          <video
            src="/login/berater-rechts.mp4"
            autoPlay
            muted
            playsInline
            preload="auto"
            aria-hidden
            className="pointer-events-none absolute -right-[242px] top-[-6px] z-0 hidden lg:top-[-158px] h-[470px] w-auto select-none md:block"
            style={{
              maskImage:
                "linear-gradient(to bottom, transparent 0, black 28px, black 78%, transparent 100%), linear-gradient(to right, transparent 0, black 40px, black calc(100% - 128px), transparent calc(100% - 64px))",
              maskComposite: "intersect",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0, black 28px, black 78%, transparent 100%), linear-gradient(to right, transparent 0, black 40px, black calc(100% - 128px), transparent calc(100% - 64px))",
              WebkitMaskComposite: "source-in",
            }}
          />

          {/* Marke mittig über dem Anmeldeformular */}
          <div className="relative z-10 mb-6 flex items-center justify-center gap-3">
            <BrandMark className="h-12 w-12 rounded-lg shadow-sm" />
            <h1 className="text-xl font-semibold tracking-tight">
              Estera GmbH
            </h1>
          </div>

          <div className="relative z-10 rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
            <h2 className="text-center text-xl font-semibold tracking-tight">
              Willkommen zurück!
            </h2>
            <p className="mt-1 text-center text-sm text-muted-foreground">
              Melde dich mit deinem Estera-Konto an.
            </p>

            <form action={formAction} className="mt-6 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="vorname@estera.de"
                  required
                  className="h-11"
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="h-11"
                />
              </div>

              {state?.error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2.5 text-sm text-danger"
                >
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                  {state.error}
                </div>
              )}

              {/* Gold-CTA: die eine Hauptaktion dieser Ansicht (§5) */}
              <Button
                type="submit"
                disabled={pending}
                className="h-11 w-full bg-accent-500 font-semibold text-background hover:bg-accent-600"
              >
                {pending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                    Anmelden …
                  </>
                ) : (
                  "Anmelden"
                )}
              </Button>
            </form>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Kein Self-Signup — Zugänge vergibt die Geschäftsführung.
          </p>
        </div>
      </section>
    </main>
  );
}
