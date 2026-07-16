-- Call SJ 3.3: Deals können auf einen verwalteten Tippgeber verweisen, damit
-- dessen Performance (Umsatz/Provision) zugeordnet werden kann. Bleibt optional
-- (nur VV); der freie Textname `tippgeber` bleibt als Fallback/Legacy erhalten.
alter table public.deals
  add column if not exists tippgeber_id uuid
    references public.tippgeber (id) on delete set null;

create index if not exists deals_tippgeber_id_idx
  on public.deals (tippgeber_id);
