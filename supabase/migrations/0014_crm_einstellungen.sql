-- =====================================================================
-- 0014 — Globale CRM-Einstellungen (GF-steuerbar)
-- Ersetzt die Code-Konstante IMMO_PROVISION_MODUS durch eine in der
-- Team-Verwaltung umschaltbare Einstellung (V4.1 Kap. 1.5, OFFEN #2):
-- „Berater-Anteil vom Kaufpreis ODER von der Estera-Provision?".
-- Key-Value-Tabelle, damit spätere globale Schalter hier andocken können.
-- Lesen: alle angemeldeten Nutzer. Schreiben: NUR GF (SECURITY DEFINER RPC).
-- =====================================================================

create table if not exists public.crm_einstellungen (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

comment on table public.crm_einstellungen is
  'Globale CRM-Einstellungen als Key-Value. Nur GF darf schreiben (per RPC).';

-- Default: bisheriger Code-Standard (Berater-Anteil von der Estera-Provision).
insert into public.crm_einstellungen (key, value)
values ('immo_provision_modus', 'anteil_von_provision')
on conflict (key) do nothing;

grant select on public.crm_einstellungen to authenticated;
grant all on public.crm_einstellungen to service_role;

alter table public.crm_einstellungen enable row level security;

-- Lesen für alle Angemeldeten (Einstellung ist nicht sensibel; die Rechen-
-- logik braucht sie überall). Schreiben gibt es KEINE Policy -> nur RPC/Service.
drop policy if exists "einstellungen_select" on public.crm_einstellungen;
create policy "einstellungen_select" on public.crm_einstellungen
  for select to authenticated using (true);

-- Immo-Provisions-Modus setzen — nur Geschäftsführung.
create or replace function public.set_immo_provision_modus(p_modus text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_gf() then
    raise exception 'Nur die Geschäftsführung darf die Provisionsberechnung ändern.';
  end if;
  if p_modus not in ('anteil_von_provision', 'anteil_von_kaufpreis') then
    raise exception 'Ungültiger Modus.';
  end if;
  insert into public.crm_einstellungen (key, value, updated_at)
  values ('immo_provision_modus', p_modus, now())
  on conflict (key) do update
    set value = excluded.value, updated_at = now();
end $$;

grant execute on function public.set_immo_provision_modus(text) to authenticated;
