-- =====================================================================
-- 0023 — Performance: Index auf profiles.parent_berater_id (Call SJ Ladezeiten)
-- Die rekursive RLS-Funktion is_ancestor() und die Downline-/Organigramm-
-- Traversierung filtern/joinen über parent_berater_id. Ohne Index macht Postgres
-- dabei Seq-Scans über die Profile — bei den geplanten 500+ Partnern spürbar.
-- Aktuell winzig, aber zukunftssicher.
-- =====================================================================
create index if not exists idx_profiles_parent
  on public.profiles (parent_berater_id);
