-- =====================================================================
-- Aufgaben: jeder darf jedem zuweisen (Mandant 06.08.2026)
--
-- Bisher konnte ein Berater nur seine Downline auswählen — die Liste kam
-- direkt aus `profiles`, und deren RLS zeigt einem Berater ausschließlich
-- sich selbst und seine Downline (0018). Die Geschäftsführung und die
-- eigene Upline waren damit gar nicht wählbar.
--
-- `profiles` wird dafür BEWUSST NICHT geöffnet: dort stehen
-- vertriebler_stufe und immo_anteil_default, und genau die dürfen andere
-- nicht sehen (Wunsch 30.07. — die Stufe der Upline darf nicht ablesbar
-- sein). Stattdessen gibt diese SECURITY-DEFINER-Funktion nur das heraus,
-- was für eine Zuweisung nötig ist: Id, Anzeigename, Rolle.
-- =====================================================================

drop function if exists public.zuweisbare_personen();

create function public.zuweisbare_personen()
returns table (id uuid, name text, rolle text)
language sql
security definer
set search_path = public
stable
as $$
  select p.id,
         (p.vorname || ' ' || p.nachname) as name,
         p.rolle::text
  from public.profiles p
  where p.aktiv
    and p.id <> auth.uid()
    and p.rolle <> 'backoffice'
  order by p.vorname, p.nachname
$$;

revoke all on function public.zuweisbare_personen() from public;
grant execute on function public.zuweisbare_personen() to authenticated;

comment on function public.zuweisbare_personen() is
  'Aktive Personen, denen man eine Aufgabe zuweisen kann (alle Rollen, ohne '
  'sich selbst). Gibt bewusst nur Id/Name/Rolle heraus — niemals Stufe oder '
  'Provisionsanteil.';
