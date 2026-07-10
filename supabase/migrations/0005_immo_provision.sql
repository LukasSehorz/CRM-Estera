-- =====================================================================
-- 0005 — Immobilien-Provision je Deal (Schleife 2, Kap. 1.1 + 1.5)
-- Der Estera-Satz ist variabel je Objekt/Bauträger (z. B. 12/14/25 %),
-- der Berater-Anteil (1–10 %) darf NUR von der Geschäftsführung gesetzt
-- werden — DB-hart per Trigger, nicht nur im Frontend.
-- =====================================================================

-- 1) Neue Felder
alter table public.deals
  add column if not exists provisionssatz numeric(5,2),
  add column if not exists berater_anteil numeric(5,2);

comment on column public.deals.provisionssatz is
  'Estera-Provisionssatz in % auf den Kaufpreis (nur Immobilien; variabel je Objekt/Bauträger, Vorschläge 12/14/25).';
comment on column public.deals.berater_anteil is
  'Berater-Anteil in % (fachlich 1–10, nur Immobilien). Nur durch Geschäftsführung setzbar (Trigger).';

alter table public.deals
  add constraint deals_provisionssatz_range
    check (provisionssatz is null or (provisionssatz >= 0 and provisionssatz <= 100)),
  add constraint deals_berater_anteil_range
    check (berater_anteil is null or (berater_anteil >= 0 and berater_anteil <= 100));

-- 2) Startwerte für den Bestand (vor dem Schutz-Trigger!), damit die
--    Umsatz-Auswertungen nicht leer sind. GF passt die Sätze je Deal an.
update public.deals set provisionssatz = 12.00
  where bereich = 'immobilien' and provisionssatz is null;
update public.deals set berater_anteil = 5.00
  where bereich = 'immobilien' and berater_anteil is null;

-- 3) Schutz: berater_anteil nur durch GF änderbar.
--    auth.uid() is null = Service-/Migrationskontext (kein Endnutzer) -> erlaubt.
create or replace function public.enforce_berater_anteil_gf()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- Berater können den Anteil beim Anlegen nicht selbst befüllen.
    if new.berater_anteil is not null
       and auth.uid() is not null
       and not public.is_gf() then
      new.berater_anteil := null;
    end if;
    return new;
  end if;

  if new.berater_anteil is distinct from old.berater_anteil
     and auth.uid() is not null
     and not public.is_gf() then
    raise exception 'Nur die Geschäftsführung darf den Berater-Anteil ändern.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_deals_berater_anteil_gf on public.deals;
create trigger trg_deals_berater_anteil_gf
  before insert or update on public.deals
  for each row execute function public.enforce_berater_anteil_gf();
