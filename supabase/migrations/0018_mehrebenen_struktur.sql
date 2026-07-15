-- =====================================================================
-- 0018 — Mehrebenen-Struktur (Call SJ F5, Struktur-Kern Schritt C)
-- Die Partner-Struktur wird MEHRSTUFIG: Anna → Eva → Lukas. Statt der
-- 1-Ebenen-Sperre nur noch Zyklen verhindern. Downline-Leserechte (Deals,
-- Profile, Tippgeber) rollen rekursiv über alle Ebenen hoch — behebt auch
-- die Lücke, dass ein Berater seine Downline-Profile nicht sehen konnte (A2).
-- =====================================================================

-- Ist p_ancestor ein (mittelbarer) Vorfahre von p_node in der parent-Kette?
create or replace function public.is_ancestor(p_ancestor uuid, p_node uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  cur uuid;
  guard int := 0;
begin
  if p_ancestor is null or p_node is null then
    return false;
  end if;
  select parent_berater_id into cur from public.profiles where id = p_node;
  while cur is not null and guard < 100 loop
    if cur = p_ancestor then
      return true;
    end if;
    select parent_berater_id into cur from public.profiles where id = cur;
    guard := guard + 1;
  end loop;
  return false;
end $$;

grant execute on function public.is_ancestor(uuid, uuid) to authenticated;

-- Anbindung setzen (GF-only): jetzt MEHRSTUFIG erlaubt, nur Zyklen sperren.
create or replace function public.set_berater_anbindung(
  target uuid, p_immo_default numeric, p_parent uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_gf() then
    raise exception 'Nur die Geschäftsführung darf die Anbindung ändern.';
  end if;
  if p_immo_default is not null and (p_immo_default < 0 or p_immo_default > 100) then
    raise exception 'Immo-Anteil muss zwischen 0 und 100 liegen.';
  end if;
  if p_parent is not null then
    if p_parent = target then
      raise exception 'Ein Berater kann nicht sein eigener übergeordneter Partner sein.';
    end if;
    -- Mehrebenen erlaubt; Zyklus verhindern: target darf kein Vorfahre von
    -- p_parent sein (sonst entstünde ein Kreis in der Struktur).
    if public.is_ancestor(target, p_parent) then
      raise exception 'Zyklus: der gewählte Partner ist diesem Berater bereits untergeordnet.';
    end if;
  end if;
  update public.profiles
     set immo_anteil_default = p_immo_default,
         parent_berater_id   = p_parent
   where id = target;
end $$;

grant execute on function public.set_berater_anbindung(uuid, numeric, uuid) to authenticated;

-- Profile: eigenes + GF alle + die GESAMTE eigene Downline (mehrstufig).
drop policy if exists "profiles_select_own_or_gf" on public.profiles;
create policy "profiles_select_own_or_gf"
  on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_gf()
    or public.is_ancestor(auth.uid(), id)
  );

-- Deals der GESAMTEN Downline lesen (mehrstufig, nicht nur direkte Partner).
drop policy if exists "deals_downline_select" on deals;
create policy "deals_downline_select" on deals
  for select using (public.is_ancestor(auth.uid(), deals.berater_id));

-- Tippgeber: GF alle, eigene, und die der gesamten Downline.
drop policy if exists "tippgeber_select" on public.tippgeber;
create policy "tippgeber_select" on public.tippgeber
  for select to authenticated
  using (
    public.is_gf()
    or owner_id = auth.uid()
    or public.is_ancestor(auth.uid(), owner_id)
  );
