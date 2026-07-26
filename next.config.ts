import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Getrennte Build-Verzeichnisse (Schleife 3): Deploys bauen über
  // NEXT_DIST_DIR=.next-deploy (siehe netlify.toml), damit ein laufender
  // Dev-Server (.next) parallele Prod-Builds nicht korrumpiert. Beide
  // Verzeichnisse sind Junctions nach C:\dev\estera-crm\* — OneDrive darf
  // Build-Artefakte nie anfassen (siehe Memory/Doku).
  distDir: process.env.NEXT_DIST_DIR || ".next",

  // Sicherheits-Header (DSGVO Art. 32 — Stand der Technik).
  // Rein schützend: für den normalen Betrieb ändert sich nichts.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Clickjacking: das CRM darf nicht in einen fremden Rahmen
          // eingebettet werden (sonst könnte eine präparierte Seite Klicks
          // des angemeldeten Nutzers abfangen).
          { key: "X-Frame-Options", value: "DENY" },
          // Verhindert, dass der Browser den Dateityp „errät" und z. B. eine
          // hochgeladene Datei doch als HTML ausführt.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Keine internen URLs (die Kunden-IDs enthalten) an fremde Seiten
          // weitergeben.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Kamera/Mikrofon/Standort werden nicht gebraucht -> abschalten.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // HSTS setzt Netlify bereits; hier explizit, damit der Schutz auch
          // nach einem Hosting-Wechsel erhalten bleibt.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
