-- =====================================================================
-- 0009 — Monatsziele je Berater (Schleife 3, Berater-Punkt 2)
-- GF legt die Ziele gemeinsam mit dem Berater fest (Pflege in der
-- Team-Verwaltung, nur GF schreibt). Eigene Tabelle statt profiles-Spalten,
-- damit Berater ihre Ziele nicht selbst ändern können (RLS: lesen = eigenes
-- Ziel oder GF, schreiben = nur GF).
-- =====================================================================

create table if not exists public.berater_monatsziele (
  berater_id            uuid primary key references public.profiles(id) on delete cascade,
  monatsziel_immobilien numeric(14,2),
  monatsziel_vv         numeric(14,2),
  updated_at            timestamptz not null default now()
);

comment on table public.berater_monatsziele is
  'Monatliches Umsatzziel (eigene Provision) je Berater und Sparte — von der GF gemeinsam mit dem Berater festgelegt.';

alter table public.berater_monatsziele enable row level security;

drop policy if exists "ziele_select_own_or_gf" on public.berater_monatsziele;
create policy "ziele_select_own_or_gf"
  on public.berater_monatsziele for select
  using (public.is_gf() or berater_id = auth.uid());

drop policy if exists "ziele_insert_gf" on public.berater_monatsziele;
create policy "ziele_insert_gf"
  on public.berater_monatsziele for insert
  with check (public.is_gf());

drop policy if exists "ziele_update_gf" on public.berater_monatsziele;
create policy "ziele_update_gf"
  on public.berater_monatsziele for update
  using (public.is_gf())
  with check (public.is_gf());

drop policy if exists "ziele_delete_gf" on public.berater_monatsziele;
create policy "ziele_delete_gf"
  on public.berater_monatsziele for delete
  using (public.is_gf());

grant select, insert, update, delete on public.berater_monatsziele to authenticated;
grant all on public.berater_monatsziele to service_role;

-- ---------------------------------------------------------------------
-- Dummy-Seed (Wunsch Lukas: „erstmal Dummie-Daten, aber tsd. €"):
-- 10.000 € Immobilien / 5.000 € VV je aktivem Berater — nur für die
-- jeweils freigeschaltete Sparte. GF bekommt kein Ziel (Box ist
-- Berater-Ansicht).
-- ---------------------------------------------------------------------
insert into public.berater_monatsziele (berater_id, monatsziel_immobilien, monatsziel_vv)
select
  p.id,
  case when 'immobilien' = any(p.bereich) then 10000 end,
  case when 'vv'         = any(p.bereich) then 5000  end
from public.profiles p
where p.rolle = 'berater' and p.aktiv
on conflict (berater_id) do nothing;
