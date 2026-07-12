-- =====================================================================
-- 0013 — Immo-Anteil-Default vorbefüllen (V4.1 Kap. 1.5a)
-- Beim Anlegen eines Immobilien-Deals wird der Berater-Anteil, falls nicht
-- gesetzt, aus der Anbindung des Deal-Beraters (profiles.immo_anteil_default)
-- vorbefüllt — pro Deal von der GF überschreibbar. Läuft NACH dem GF-Schutz-
-- Trigger (Name sortiert nach „trg_deals_berater_anteil_gf"), SECURITY
-- DEFINER, damit der Default auch bei berater-angelegten Deals greift.
-- =====================================================================

create or replace function public.fill_immo_anteil_default()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_default numeric;
begin
  if new.bereich = 'immobilien' and new.berater_anteil is null then
    select immo_anteil_default into v_default
      from public.profiles where id = new.berater_id;
    if v_default is not null then
      new.berater_anteil := v_default;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_deals_immo_default on public.deals;
create trigger trg_deals_immo_default
  before insert on public.deals
  for each row execute function public.fill_immo_anteil_default();
