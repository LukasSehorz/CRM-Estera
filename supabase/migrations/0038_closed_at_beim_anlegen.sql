-- Feedback Mandant (07.09.2026), Folgefund zum „Kunde seit"-Datum:
-- track_deal_stage() setzt deals.closed_at NUR beim Phasen-UPDATE, und immer
-- auf now(). Wer einen Altbestands-Deal direkt in der Gewinn-Phase anlegt
-- (genau der Weg für die >75 Bestandsprojekte), bekam closed_at = null bzw.
-- das Importdatum. Folge: kein oder ein falsches Abschlussdatum — also
-- weiterhin „alles durcheinander" in Liste, Board und Auswertung.
--
-- HINWEIS an den Betrieb: Das Backfill unten macht bereits gewonnene Deals
-- erstmals fuer Umsatz-/Zielauswertungen sichtbar (sie waren wegen
-- closed_at is null bisher ausgeschlossen). Monatszahlen der Vergangenheit
-- koennen sich dadurch aendern.

-- 1) closed_at beim INSERT setzen — ein mitgegebenes Datum hat Vorrang.
create or replace function public.set_closed_at_on_insert()
returns trigger as $$
declare
  v_is_won boolean;
begin
  select is_won into v_is_won from pipeline_stages where id = new.stage_id;
  if (v_is_won and new.closed_at is null) then
    new.closed_at = now();
  elsif (not coalesce(v_is_won, false)) then
    new.closed_at = null; -- offene/verlorene Phase hat kein Abschlussdatum
  end if;
  return new;
end;
$$ language plpgsql;

alter function public.set_closed_at_on_insert()
  security definer set search_path = public, pg_temp;

drop trigger if exists trg_deals_closed_at_insert on deals;
create trigger trg_deals_closed_at_insert
  before insert on deals
  for each row execute function public.set_closed_at_on_insert();

-- 2) Beim UPDATE ein explizit gesetztes Abschlussdatum respektieren.
--    Drag&Drop schreibt closed_at nicht mit -> new = old -> now() wie bisher.
--    Das Deal-Formular schickt ein abweichendes Datum -> es bleibt stehen.
create or replace function public.track_deal_stage()
returns trigger as $$
declare
  v_is_won boolean;
begin
  if (tg_op = 'INSERT') then
    insert into deal_stage_history (deal_id, stage_id, entered_at, changed_by)
    values (new.id, new.stage_id, now(), auth.uid());
    return new;
  end if;

  if (tg_op = 'UPDATE' and new.stage_id is distinct from old.stage_id) then
    update deal_stage_history
      set left_at = now()
      where deal_id = new.id and left_at is null;

    insert into deal_stage_history (deal_id, stage_id, entered_at, changed_by)
    values (new.id, new.stage_id, now(), auth.uid());

    select is_won into v_is_won from pipeline_stages where id = new.stage_id;
    if (v_is_won) then
      -- Nur stempeln, wenn der Aufrufer kein eigenes Datum mitgegeben hat.
      if (new.closed_at is not distinct from old.closed_at) then
        new.closed_at = now();
      end if;
    else
      new.closed_at = null;
    end if;
  end if;

  return new;
end;
$$ language plpgsql;

alter function public.track_deal_stage()
  security definer set search_path = public, pg_temp;

-- 3) Bestandsdaten nachziehen: gewonnene Deals ohne closed_at bekommen den
--    Eintritt in die aktuelle (offene) Phase, ersatzweise das Anlagedatum.
--    Bewusst der OFFENE Historieneintrag (left_at is null) — bei einem Deal,
--    der zurueckgeholt und erneut gewonnen wurde, zaehlt der letzte Gewinn.
update deals d
set closed_at = coalesce(
  (select h.entered_at
     from deal_stage_history h
    where h.deal_id = d.id
      and h.stage_id = d.stage_id
      and h.left_at is null
    order by h.entered_at desc
    limit 1),
  d.created_at
)
from pipeline_stages s
where s.id = d.stage_id
  and s.is_won
  and d.closed_at is null;

comment on function public.set_closed_at_on_insert() is
  'Setzt closed_at, wenn ein Deal direkt in einer Gewinn-Phase angelegt wird.';
