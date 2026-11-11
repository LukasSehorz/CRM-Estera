-- =====================================================================
-- 0041 — Zustellprüfung der Lead-SMS (Wunsch Lukas 11.11.2026).
-- Anlass: Die SMS zum ersten echten Meta-Lead wurde von seven.io
-- angenommen, vom Mobilfunknetz aber als „nicht zugestellt“ gemeldet.
-- Das CRM merkte davon nichts.
--
-- Jede Lead-SMS bekommt hier eine Zeile mit der ID bei seven.io. Der
-- Abgleich (alle 5 Min.) fragt den Zustellstatus ab, sendet bei
-- Fehlschlag neu (höchstens 3 Versuche) und schlägt danach per Mail Alarm.
--
-- Nur der Server (Service-Role) liest und schreibt: RLS an, keine Policy.
-- =====================================================================

create table if not exists public.meta_lead_sms (
  id            uuid primary key default gen_random_uuid(),
  contact_id    uuid references public.contacts(id) on delete cascade,
  meta_lead_id  text,
  empfaenger    text not null,
  nachricht     text not null,
  msg_id        text,
  versuch       integer not null default 1,
  status        text not null default 'offen'
                check (status in ('offen', 'zugestellt', 'fehlgeschlagen')),
  seven_status  text,
  erledigt      boolean not null default false,
  created_at    timestamptz not null default now(),
  geprueft_at   timestamptz
);

create index if not exists meta_lead_sms_offen_idx
  on public.meta_lead_sms (created_at)
  where erledigt = false;

alter table public.meta_lead_sms enable row level security;

comment on table public.meta_lead_sms is
  'Lead-SMS an den Berater (seven.io): je Versuch eine Zeile mit Zustellstatus.';
comment on column public.meta_lead_sms.msg_id is 'ID der SMS bei seven.io, für die Statusabfrage.';
comment on column public.meta_lead_sms.versuch is '1 = erste SMS, 2 und 3 = automatische Wiederholung.';
comment on column public.meta_lead_sms.seven_status is 'Letzter Status von seven.io (DELIVERED, NOTDELIVERED, …).';
comment on column public.meta_lead_sms.erledigt is
  'true: zugestellt, oder Fehlschlag ist abgearbeitet (Wiederholung gesendet bzw. Alarm verschickt).';
