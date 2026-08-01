"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { KeyRound, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

/**
 * Passwort selbst ändern (Wunsch Mandant 30.07.): freiwillig, für JEDE Rolle.
 * Das aktuelle Passwort wird abgefragt und geprüft — sonst könnte an einem
 * offenen Rechner ein Fremder das Konto übernehmen. Erst danach wird das
 * neue Passwort gesetzt.
 */
export function PasswortForm({ email }: { email: string }) {
  const leer = { aktuell: "", neu: "", wiederholung: "" };
  const [v, setV] = useState(leer);
  const [fertig, setFertig] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function set<K extends keyof typeof v>(key: K, value: string) {
    setV((prev) => ({ ...prev, [key]: value }));
  }

  /** Meldung dauerhaft im Formular zeigen (ein Toast allein verschwindet). */
  function melde(text: string) {
    setFehler(text);
    toast.error(text);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFehler(null);
    if (v.neu.length < 8) {
      melde("Das neue Passwort braucht mindestens 8 Zeichen.");
      return;
    }
    if (v.neu !== v.wiederholung) {
      melde("Die beiden neuen Passwörter stimmen nicht überein.");
      return;
    }
    if (v.neu === v.aktuell) {
      melde("Das neue Passwort muss sich vom alten unterscheiden.");
      return;
    }

    start(async () => {
      const supabase = createClient();
      // 1) Aktuelles Passwort verifizieren.
      const { error: loginFehler } = await supabase.auth.signInWithPassword({
        email,
        password: v.aktuell,
      });
      if (loginFehler) {
        melde("Das aktuelle Passwort ist nicht korrekt.");
        return;
      }
      // 2) Neues Passwort setzen.
      const { error } = await supabase.auth.updateUser({ password: v.neu });
      if (error) {
        melde(
          error.message.includes("should be different")
            ? "Das neue Passwort muss sich vom alten unterscheiden."
            : "Passwort konnte nicht geändert werden. Bitte erneut versuchen.",
        );
        return;
      }
      setV(leer);
      setFehler(null);
      setFertig(true);
      toast.success("Passwort geändert.");
    });
  }

  if (fertig) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-success/30 bg-success/5 px-4 py-8 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm font-semibold">Passwort geändert</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Beim nächsten Anmelden gilt dein neues Passwort.
          </p>
        </div>
        <Button variant="outline" onClick={() => setFertig(false)}>
          Erneut ändern
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pw-aktuell">Aktuelles Passwort *</Label>
        <Input
          id="pw-aktuell"
          type="password"
          required
          autoComplete="current-password"
          value={v.aktuell}
          onChange={(e) => set("aktuell", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pw-neu">Neues Passwort * (min. 8 Zeichen)</Label>
        <Input
          id="pw-neu"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={v.neu}
          onChange={(e) => set("neu", e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="pw-wdh">Neues Passwort wiederholen *</Label>
        <Input
          id="pw-wdh"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={v.wiederholung}
          onChange={(e) => set("wiederholung", e.target.value)}
        />
      </div>
      {fehler && (
        <p
          role="alert"
          className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger"
        >
          {fehler}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        <KeyRound className="h-4 w-4" />
        {pending ? "Wird geändert …" : "Passwort ändern"}
      </Button>
    </form>
  );
}
