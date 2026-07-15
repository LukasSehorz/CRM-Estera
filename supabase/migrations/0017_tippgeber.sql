-- =====================================================================
-- 0017 — Tippgeber als leichte Einträge (Call SJ F6, Struktur-Kern Schritt A)
-- Tippgeber sind KEINE Login-Nutzer. Sie werden in der Team-Verwaltung
-- angelegt und hängen unter einem Berater/der GF (owner_id) — mit
-- individuellem Provisionssatz und Sparten. RLS: die GF sieht/pflegt alle,
-- ein Berater nur die eigenen (owner_id = auth.uid()).
-- =====================================================================
create table if not exists public.tippgeber (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  provision_satz numeric(5,2),
  bereiche       bereich_enum[] not null default '{immobilien}',
  aktiv          boolean not null default true,
  created_at     timestamptz not null default now()
);

comment on table public.tippgeber is
  'Tippgeber (Struktur, ohne Login): hängen unter owner_id (Berater/GF), '
  'individueller Provisionssatz. Angelegt in der Team-Verwaltung (F6).';

create index if not exists idx_tippgeber_owner on public.tippgeber(owner_id);

grant select, insert, update, delete on public.tippgeber to authenticated;

alter table public.tippgeber enable row level security;

-- Sichtbar/pflegbar: GF alles, Berater nur die eigenen.
drop policy if exists "tippgeber_select" on public.tippgeber;
create policy "tippgeber_select" on public.tippgeber
  for select to authenticated
  using (public.is_gf() or owner_id = auth.uid());

drop policy if exists "tippgeber_insert" on public.tippgeber;
create policy "tippgeber_insert" on public.tippgeber
  for insert to authenticated
  with check (public.is_gf() or owner_id = auth.uid());

drop policy if exists "tippgeber_update" on public.tippgeber;
create policy "tippgeber_update" on public.tippgeber
  for update to authenticated
  using (public.is_gf() or owner_id = auth.uid())
  with check (public.is_gf() or owner_id = auth.uid());

drop policy if exists "tippgeber_delete" on public.tippgeber;
create policy "tippgeber_delete" on public.tippgeber
  for delete to authenticated
  using (public.is_gf() or owner_id = auth.uid());
