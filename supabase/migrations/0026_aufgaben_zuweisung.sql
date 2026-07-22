-- =====================================================================
-- 0026 — Aufgaben zuweisen (Kunden-Feedback 22.07.).
-- Eine Aufgabe kann jemand anderem zugewiesen werden (assigned_to). Der
-- Ersteller bleibt owner_id. Sichtbar: GF, Ersteller, Zugewiesener und die
-- Upline des Zugewiesenen (Vorgesetzte können zugewiesene Aufgaben verfolgen).
-- =====================================================================

alter table public.tasks
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null;

-- Bestand: bisher = Selbst-Aufgaben, also assigned_to = owner_id.
update public.tasks set assigned_to = owner_id where assigned_to is null;

create index if not exists idx_tasks_assigned
  on public.tasks (assigned_to, erledigt, faellig_am);

-- Alte Sammel-Policy ersetzen durch getrennte Policies (unterschiedliche
-- Rechte je Kommando: Ersteller/GF erstellen & löschen, Zugewiesener erledigt).
drop policy if exists tasks_all on public.tasks;

drop policy if exists tasks_select on public.tasks;
create policy tasks_select on public.tasks
  for select using (
    public.is_gf()
    or owner_id = auth.uid()
    or assigned_to = auth.uid()
    or (assigned_to is not null and public.is_ancestor(auth.uid(), assigned_to))
  );

drop policy if exists tasks_insert on public.tasks;
create policy tasks_insert on public.tasks
  for insert with check (public.is_gf() or owner_id = auth.uid());

-- Aktualisieren (z. B. erledigt): Ersteller, Zugewiesener, Upline oder GF.
drop policy if exists tasks_update on public.tasks;
create policy tasks_update on public.tasks
  for update using (
    public.is_gf()
    or owner_id = auth.uid()
    or assigned_to = auth.uid()
    or (assigned_to is not null and public.is_ancestor(auth.uid(), assigned_to))
  );

-- Löschen: nur Ersteller oder GF.
drop policy if exists tasks_delete on public.tasks;
create policy tasks_delete on public.tasks
  for delete using (public.is_gf() or owner_id = auth.uid());
