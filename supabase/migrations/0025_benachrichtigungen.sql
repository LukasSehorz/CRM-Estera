-- =====================================================================
-- 0025 — In-App-Benachrichtigungen (Kunden-Feedback 22.07.).
-- Persistierte Benachrichtigungen je Empfänger; werden als Nebeneffekt beim
-- Zuweisen von Aufgaben (Phase 4) und beim Freischalten von Dokumenten an
-- Finanzierer (Phase 5) erzeugt. Anzeige: Glocke/Zähler + Liste im CRM.
-- =====================================================================

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  empfaenger_id uuid not null references public.profiles(id) on delete cascade,
  typ          text not null default 'info',      -- 'aufgabe' | 'dokument' | 'info'
  titel        text not null,
  text         text,
  link         text,                              -- Ziel-Route beim Klick
  gelesen      boolean not null default false,
  erzeugt_von  uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_notifications_empfaenger
  on public.notifications (empfaenger_id, gelesen, created_at desc);

alter table public.notifications enable row level security;

-- Basisrechte für authentifizierte Nutzer (RLS filtert die Zeilen darüber).
grant select, insert, update, delete on public.notifications to authenticated;

-- Lesen: nur der Empfänger (GF sieht alles, wie überall).
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select using (empfaenger_id = auth.uid() or public.is_gf());

-- Aktualisieren (als gelesen markieren): nur der Empfänger.
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update using (empfaenger_id = auth.uid())
  with check (empfaenger_id = auth.uid());

-- Erzeugen: jeder Authentifizierte darf eine Benachrichtigung an einen
-- gültigen Empfänger schreiben (nur in kontrollierten App-Flows genutzt:
-- Aufgabe zuweisen, Dokument freischalten). erzeugt_von = man selbst.
drop policy if exists notifications_insert on public.notifications;
create policy notifications_insert on public.notifications
  for insert with check (erzeugt_von = auth.uid() and empfaenger_id is not null);

-- Löschen: der Empfänger darf eigene Benachrichtigungen entfernen.
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete using (empfaenger_id = auth.uid() or public.is_gf());
