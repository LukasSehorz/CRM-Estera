-- =====================================================================
-- 0035 — Profilbild je Nutzer
--
-- Bisher war das Porträt hart verdrahtet: JEDES Konto mit der Rolle
-- 'geschaeftsfuehrung' zeigte Foto und Namen von Ioannis Orfanidis. Seit
-- es zwei Geschäftsführer gibt, sieht Sebastian sich dort als Ioannis —
-- das ist nicht nur kosmetisch falsch, es macht die Oberfläche unbrauchbar
-- für die Frage „mit wem bin ich gerade angemeldet?".
--
-- Jeder Nutzer lädt sein Bild künftig selbst hoch. Ohne Bild bleibt der
-- vorhandene Platzhalter (Initialen im Kreis).
-- =====================================================================

begin;

alter table public.profiles
  add column if not exists avatar_url text;

comment on column public.profiles.avatar_url is
  'Pfad des Profilbilds im Bucket "avatare" (<user-id>/<datei>). '
  'NULL = kein Bild, die Oberfläche zeigt dann die Initialen.';

-- Privater Bucket. Profilbilder sind personenbezogene Daten und haben im
-- offenen Netz nichts verloren — Auslieferung wie bei den Kundendokumenten
-- über kurzlebige signierte Links.
insert into storage.buckets (id, name, public)
values ('avatare', 'avatare', false)
on conflict (id) do nothing;

-- Pfad-Konvention: <user-id>/<datei> — erste Ordnerebene ist die eigene ID.
-- Damit kann niemand in fremde Ordner schreiben.
drop policy if exists "avatare_insert" on storage.objects;
create policy "avatare_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatare'
    and public.is_aktiv()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatare_update" on storage.objects;
create policy "avatare_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatare'
    and public.is_aktiv()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatare_delete" on storage.objects;
create policy "avatare_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatare'
    and public.is_aktiv()
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_gf())
  );

-- Lesen: das eigene Bild immer; die Geschäftsführung alle (für Teamlisten).
drop policy if exists "avatare_select" on storage.objects;
create policy "avatare_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatare'
    and public.is_aktiv()
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_gf())
  );

-- ---------------------------------------------------------------------
-- Setzen des Pfads über eine SECURITY-DEFINER-Funktion.
--
-- Grund: public.profiles hat bewusst KEINE UPDATE-Policy — sonst könnte
-- sich ein Berater selbst zur Geschäftsführung hochstufen. Statt diese
-- Sperre aufzuweichen, ändert die Funktion ausschließlich avatar_url und
-- ausschließlich für den Aufrufer. Rolle, Stufe und Anbindung bleiben
-- unerreichbar.
-- ---------------------------------------------------------------------
create or replace function public.set_mein_avatar(p_pfad text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'Nicht angemeldet.';
  end if;
  if not public.is_aktiv() then
    raise exception 'Dieser Zugang ist gesperrt.';
  end if;
  -- Fremde Ordner ausschließen: der Pfad muss mit der eigenen ID beginnen.
  if p_pfad is not null and split_part(p_pfad, '/', 1) <> auth.uid()::text then
    raise exception 'Ungültiger Pfad.';
  end if;

  update public.profiles
     set avatar_url = p_pfad
   where id = auth.uid();
end $$;

grant execute on function public.set_mein_avatar(text) to authenticated;

commit;
