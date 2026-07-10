# Estera CRM

Individuell programmiertes **Vertriebs-CRM** für die Estera GmbH
(Kapitalanlage-Immobilien + Vermögensverwaltung). Kein Maklersoftware-Klon:
Fokus auf Leads, zwei Pipelines, Finanzierungs-Tracking, Berater-Performance
und Reporting.

Verbindliche Dokumente:
- [`CLAUDE.md`](./CLAUDE.md) — Projektregeln & Konventionen (Source of Truth fürs Vorgehen)
- [`docs/anforderungen.md`](./docs/anforderungen.md) — fachliche Spezifikation
- [`docs/datenmodell.md`](./docs/datenmodell.md) — Tabellen & Analytics-Definitionen
- [`docs/build-plan.md`](./docs/build-plan.md) — Phasenplan

## Tech-Stack

- **Next.js 15** (App Router) + **TypeScript** (strict)
- **Tailwind CSS v4** + **shadcn/ui**
- **Supabase** (Postgres + Auth + Row Level Security)
- Deployment: Vercel (App) + Supabase (DB)

## Voraussetzungen

- Node.js **20+**
- Ein Supabase-Projekt (für DB & Auth)

## Einrichtung (lokal)

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Umgebungsvariablen anlegen
cp .env.example .env.local
#   danach .env.local öffnen und die Supabase-Werte eintragen

# 3. Dev-Server starten
npm run dev
```

App läuft anschließend auf http://localhost:3000 (Dashboard unter `/dashboard`).

> **Datenbank:** Die SQL-Migration und der Seed liegen unter
> [`supabase/`](./supabase/) und werden in **Phase 1** eingespielt
> (Schema, Pipeline-Phasen, Berater). In Phase 0 ist die DB noch nicht nötig,
> um die App zu starten.

## Skripte

| Befehl              | Zweck                                  |
| ------------------- | -------------------------------------- |
| `npm run dev`       | Entwicklungsserver                     |
| `npm run build`     | Produktions-Build                      |
| `npm run start`     | Produktions-Server (nach `build`)      |
| `npm run lint`      | ESLint                                 |
| `npm run typecheck` | TypeScript-Prüfung ohne Build          |

## Projektstruktur

```
.
├── CLAUDE.md                 # Projektregeln & Konventionen
├── docs/                     # Spezifikation, Datenmodell, Build-Plan
├── supabase/
│   └── migrations/           # 0001_schema.sql, seed.sql (NICHT in Phase 0 ändern)
└── src/
    ├── app/                  # App Router
    │   ├── (dashboard)/      # geschützter Bereich (Schutz ab Phase 2)
    │   ├── globals.css       # Tailwind v4 + shadcn-Tokens
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components/ui/         # shadcn/ui-Komponenten
    ├── config/               # zentrale Enums (Phase 1)
    ├── hooks/                 # Client-Hooks (z. B. TanStack Query)
    ├── lib/
    │   ├── analytics/         # Auswertungslogik (Phase 6)
    │   ├── supabase/          # server.ts, client.ts, middleware.ts
    │   └── utils.ts           # cn()-Helper
    ├── types/                # generierte DB-Typen (Phase 1)
    └── middleware.ts         # Session-Refresh (Routen-Schutz ab Phase 2)
```

## Phasen-Status

- [x] **Phase 0** — Setup (Next.js, Tailwind, shadcn, Supabase-Clients, Struktur)
- [ ] Phase 1 — Datenmodell + Seed
- [ ] Phase 2 — Auth + RLS + Rollen
- [ ] Phase 3 — Kontakte
- [ ] Phase 4 — Deals + Pipelines
- [ ] Phase 5 — Listen / Übersichten
- [ ] Phase 6 — Dashboards
- [ ] Phase 7 — UI-Politur + Navigation
- [ ] Phase 8 — Deployment + Test

Details siehe [`docs/build-plan.md`](./docs/build-plan.md).

> **Hinweis zu Paketversionen:** Die Versionen in `package.json` sind als
> sinnvolle Stände gepinnt. Falls eine Version nicht auflösbar ist, lässt sie
> sich gefahrlos aktualisieren (`npm install <paket>@latest`).
