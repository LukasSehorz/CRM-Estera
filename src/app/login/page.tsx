"use client";

import { useActionState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { login, type LoginState } from "./actions";
import { BrandMark } from "@/components/layout/brand-mark";
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

  return (
    <main className="grid min-h-screen bg-background lg:grid-cols-2">
      {/* Marken-Panel — immer Navy, unabhängig vom Theme (Klasse "dark"
          erzwingt die Dark-Tokens nur in diesem Teilbaum). */}
      <section
        className="dark relative hidden overflow-hidden border-r border-border bg-background text-foreground lg:flex lg:flex-col lg:justify-between lg:p-10"
        aria-label="Estera"
      >
        {/* Atmosphäre: zwei weiche Lichtquellen + feine Ringe, kein Feuerwerk */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute -right-40 -top-40 h-[30rem] w-[30rem] rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, color-mix(in srgb, var(--gold) 14%, transparent), transparent 72%)",
            }}
          />
          <div
            className="absolute -bottom-48 -left-32 h-[34rem] w-[34rem] rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, color-mix(in srgb, var(--stage-1) 12%, transparent), transparent 72%)",
            }}
          />
          <div className="absolute right-10 top-16 h-72 w-72 rounded-full border border-gold/10" />
          <div className="absolute right-24 top-32 h-40 w-40 rounded-full border border-gold/15" />
        </div>

        <div
          className="relative flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDuration: "700ms" }}
        >
          <BrandMark className="h-10 w-10 rounded-lg" />
          <div>
            <div className="text-sm font-semibold tracking-tight">
              Estera CRM
            </div>
            <div className="text-xs text-muted-foreground">Vertriebs-CRM</div>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1
            className="text-4xl font-semibold leading-tight tracking-tight animate-in fade-in slide-in-from-bottom-2"
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
            className="mt-4 text-sm leading-relaxed text-muted-foreground animate-in fade-in slide-in-from-bottom-2"
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
            className="mt-6 flex items-center gap-4 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-2"
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
      <section className="flex items-center justify-center p-6">
        <div
          className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-2"
          style={{ animationDuration: "500ms" }}
        >
          {/* Mobile: kompakte Marke über der Karte */}
          <div className="mb-6 flex flex-col items-center gap-3 text-center lg:hidden">
            <BrandMark className="h-14 w-14 rounded-xl shadow-sm" />
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                Estera CRM
              </h1>
              <p className="text-sm text-muted-foreground">Vertriebs-CRM</p>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm sm:p-8">
            <h2 className="text-xl font-semibold tracking-tight">
              Willkommen zurück
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
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
                className="h-11 w-full bg-accent-500 font-semibold text-foreground hover:bg-accent-600 dark:text-background"
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
