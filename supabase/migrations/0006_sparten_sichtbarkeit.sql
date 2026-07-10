-- =====================================================================
-- 0006 — Sparten-Sichtbarkeit je Berater (Schleife 2, Kap. 2 + Wunsch C)
-- Die GF stellt je Berater ein, ob er Immobilien, VV oder beides sieht.
-- Durchgesetzt per RLS auf deals (Frontend blendet nur zusätzlich aus).
-- Nutzt das seit 0001 vorhandene Feld profiles.bereich (bereich_enum[]).
-- =====================================================================

-- 1) Bestand absichern: alle Profile behalten zunächst BEIDE Sparten,
--    damit beim Scharfschalten niemand unbemerkt Deals aus der Sicht
--    verliert. Die GF schränkt anschließend bewusst über die Team-Seite ein.
update public.profiles set bereich = '{immobilien,vv}'::bereich_enum[];

-- 2) Hilfsfunktion: Hat der aktuelle Nutzer Zugriff auf die Sparte?
--    GF immer; Berater nur, wenn die Sparte in seinem Profil steht.
--    SECURITY DEFINER, damit der profiles-Lookup keine RLS-Rekursion auslöst.
create or replace function public.has_bereich(b bereich_enum)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_gf() or exists (
    select 1 from public.profiles
    where id = auth.uid() and b = any(bereich)
  );
$$;

grant execute on function public.has_bereich(bereich_enum) to authenticated;

-- 3) DEALS-Policies um die Sparten-Prüfung erweitern.
drop policy if exists "deals_select" on public.deals;
create policy "deals_select"
  on public.deals for select to authenticated
  using (
    public.is_gf()
    or (berater_id = auth.uid() and public.has_bereich(bereich))
  );

drop policy if exists "deals_insert" on public.deals;
create policy "deals_insert"
  on public.deals for insert to authenticated
  with check (
    public.is_gf()
    or (berater_id = auth.uid() and public.has_bereich(bereich))
  );

drop policy if exists "deals_update" on public.deals;
create policy "deals_update"
  on public.deals for update to authenticated
  using (
    public.is_gf()
    or (berater_id = auth.uid() and public.has_bereich(bereich))
  )
  with check (
    public.is_gf()
    or (berater_id = auth.uid() and public.has_bereich(bereich))
  );

drop policy if exists "deals_delete" on public.deals;
create policy "deals_delete"
  on public.deals for delete to authenticated
  using (
    public.is_gf()
    or (berater_id = auth.uid() and public.has_bereich(bereich))
  );

-- Historie folgt der Deal-Sichtbarkeit (inkl. Sparte).
drop policy if exists "deal_stage_history_select" on public.deal_stage_history;
create policy "deal_stage_history_select"
  on public.deal_stage_history for select to authenticated
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_stage_history.deal_id
        and (
          public.is_gf()
          or (d.berater_id = auth.uid() and public.has_bereich(d.bereich))
        )
    )
  );

-- 4) Sparten setzen darf NUR die GF (analog set_vertriebler_stufe).
--    Mindestens eine Sparte muss aktiv bleiben.
create or replace function public.set_berater_bereiche(
  target uuid,
  neue_bereiche bereich_enum[]
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_gf() then
    raise exception 'Nur die Geschäftsführung darf Sparten zuweisen.';
  end if;
  if coalesce(array_length(neue_bereiche, 1), 0) < 1 then
    raise exception 'Mindestens eine Sparte muss aktiv sein.';
  end if;
  update public.profiles set bereich = neue_bereiche where id = target;
end;
$$;

grant execute on function public.set_berater_bereiche(uuid, bereich_enum[]) to authenticated;
