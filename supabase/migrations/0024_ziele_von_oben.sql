-- =====================================================================
-- 0024 — Ziele werden nur noch „von oben" gesetzt (Kunden-Feedback 22.07.).
-- Kein Berater setzt sein eigenes Ziel mehr. Setzen darf:
--   • die Geschäftsführung für ALLE, und
--   • ein Berater für seine DIREKTEN Berater (parent_berater_id = auth.uid()).
-- =====================================================================

-- Autorisierender Setter (SECURITY DEFINER umgeht die reine GF-RLS der Tabelle).
create or replace function public.set_monatsziel_fuer(
  p_target uuid,
  p_immo numeric,
  p_vv numeric
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Eigenes Ziel darf man NICHT selbst setzen.
  if p_target = auth.uid() then
    raise exception 'Das eigene Ziel kann man nicht selbst setzen.';
  end if;
  -- Nur GF oder der DIREKTE Vorgesetzte des Zielberaters.
  if not (
    public.is_gf()
    or exists (
      select 1 from public.profiles
       where id = p_target
         and parent_berater_id = auth.uid()
    )
  ) then
    raise exception 'Nur die Geschäftsführung oder der direkte Vorgesetzte darf dieses Ziel setzen.';
  end if;
  if p_immo is not null and p_immo < 0 then raise exception 'Ziel muss positiv sein.'; end if;
  if p_vv   is not null and p_vv   < 0 then raise exception 'Ziel muss positiv sein.'; end if;

  insert into public.berater_monatsziele (berater_id, monatsziel_immobilien, monatsziel_vv)
  values (p_target, p_immo, p_vv)
  on conflict (berater_id) do update
    set monatsziel_immobilien = excluded.monatsziel_immobilien,
        monatsziel_vv         = excluded.monatsziel_vv,
        updated_at            = now();
end $$;

grant execute on function public.set_monatsziel_fuer(uuid, numeric, numeric) to authenticated;

-- Selbst-Setzen entfällt vollständig.
drop function if exists public.set_eigenes_monatsziel(numeric, numeric);
