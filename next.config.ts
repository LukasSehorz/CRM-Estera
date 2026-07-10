import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Getrennte Build-Verzeichnisse (Schleife 3): Deploys bauen über
  // NEXT_DIST_DIR=.next-deploy (siehe netlify.toml), damit ein laufender
  // Dev-Server (.next) parallele Prod-Builds nicht korrumpiert. Beide
  // Verzeichnisse sind Junctions nach C:\dev\estera-crm\* — OneDrive darf
  // Build-Artefakte nie anfassen (siehe Memory/Doku).
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
