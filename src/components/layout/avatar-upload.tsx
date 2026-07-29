"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, Loader2, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const BUCKET = "avatare";
const MAX_BYTES = 5 * 1024 * 1024;

/** Nur Bildformate — hier gilt dieselbe Regel wie bei den Kundendokumenten:
 *  aktive Formate (SVG) sind ausgeschlossen, weil sie im Browser Code
 *  ausführen können. Der Content-Type wird aus der Endung abgeleitet und
 *  nicht vom Browser übernommen. */
const ERLAUBT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((t) => t[0]?.toUpperCase() ?? "")
    .join("");
}

/**
 * Profilbild in der Seitenleiste. Ohne Bild steht dort der Platzhalter mit
 * den Initialen; ein Klick öffnet ein kleines Fenster zum Hochladen.
 */
export function AvatarUpload({
  name,
  fotoUrl,
  hatBild,
  rail = false,
}: {
  name: string;
  fotoUrl: string | null;
  /** Ist ein Bild hinterlegt? (steuert den Entfernen-Knopf) */
  hatBild: boolean;
  /** Schmale Leiste: dann kein Hover-Overlay, nur Klickfläche. */
  rail?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [offen, setOffen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const datei = e.target.files?.[0];
    e.target.value = "";
    if (!datei) return;

    const endung = datei.name.split(".").pop()?.toLowerCase() ?? "";
    const contentType = ERLAUBT[endung];
    if (!contentType) {
      toast.error(
        "Bitte ein Bild auswählen (JPG, PNG, WEBP oder HEIC).",
      );
      return;
    }
    if (datei.size > MAX_BYTES) {
      toast.error("Das Bild ist zu groß (max. 5 MB).");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Nicht angemeldet.");
        return;
      }

      // Altes Bild merken, um es nach dem Wechsel zu entfernen — sonst
      // sammeln sich verwaiste Dateien im Speicher an.
      const { data: alt } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      const pfad = `${user.id}/${crypto.randomUUID()}.${endung}`;
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(pfad, datei, { upsert: false, contentType });
      if (upErr) {
        console.error("Avatar-Upload fehlgeschlagen:", upErr);
        toast.error(`Hochladen fehlgeschlagen: ${upErr.message}`);
        return;
      }

      const { error: rpcErr } = await supabase.rpc("set_mein_avatar", {
        p_pfad: pfad,
      });
      if (rpcErr) {
        await supabase.storage.from(BUCKET).remove([pfad]);
        console.error("Avatar speichern fehlgeschlagen:", rpcErr);
        toast.error("Bild konnte nicht gespeichert werden.");
        return;
      }

      if (alt?.avatar_url) {
        await supabase.storage.from(BUCKET).remove([alt.avatar_url]);
      }

      toast.success("Profilbild aktualisiert");
      setOffen(false);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function entfernen() {
    start(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: alt } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      const { error } = await supabase.rpc("set_mein_avatar", { p_pfad: null });
      if (error) {
        toast.error("Entfernen fehlgeschlagen.");
        return;
      }
      if (alt?.avatar_url) {
        await supabase.storage.from(BUCKET).remove([alt.avatar_url]);
      }
      toast.success("Profilbild entfernt");
      setOffen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOffen(true)}
        title="Profilbild ändern"
        aria-label="Profilbild ändern"
        className="group/avatar relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-offset-2 ring-offset-sidebar transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
      >
        {fotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={fotoUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="grid h-full w-full place-items-center rounded-full bg-secondary text-xs font-semibold">
            {initials(name)}
          </span>
        )}
        {!rail && (
          <span className="absolute inset-0 grid place-items-center bg-black/55 opacity-0 transition-opacity group-hover/avatar:opacity-100">
            <Camera className="h-3.5 w-3.5 text-white" aria-hidden />
          </span>
        )}
      </button>

      {offen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Profilbild"
          onClick={() => !busy && setOffen(false)}
        >
          <div
            className="w-full max-w-sm rounded-xl border border-border bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Profilbild</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  JPG, PNG, WEBP oder HEIC · maximal 5 MB
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOffen(false)}
                disabled={busy}
                aria-label="Schließen"
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-surface-2 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 flex flex-col items-center gap-4">
              <div className="h-24 w-24 overflow-hidden rounded-full border border-border">
                {fotoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={fotoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center bg-secondary text-2xl font-semibold">
                    {initials(name)}
                  </span>
                )}
              </div>

              <input
                ref={fileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.heic,.heif"
                className="hidden"
                onChange={onFile}
              />

              <div className="flex w-full flex-col gap-2">
                <Button
                  type="button"
                  disabled={busy || pending}
                  onClick={() => fileRef.current?.click()}
                  className="w-full"
                >
                  {busy ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                      Wird hochgeladen …
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" aria-hidden />
                      {hatBild ? "Anderes Bild wählen" : "Profilbild hinzufügen"}
                    </>
                  )}
                </Button>

                {hatBild && (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={busy || pending}
                    onClick={entfernen}
                    className={cn("w-full text-destructive hover:text-destructive")}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                    Bild entfernen
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
