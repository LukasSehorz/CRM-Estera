-- =====================================================================
-- 0016 — Immobilien-Provisionsmodus festgelegt: „vom Kaufpreis" (Call SJ F3)
-- Der GF-Umschalter entfällt; der Berater-Anteil wird immer vom Kaufpreis
-- gerechnet. Wert wird gesetzt (Upsert), damit getImmoModus/Analytics ihn
-- konsistent liefern.
-- =====================================================================
insert into public.crm_einstellungen (key, value)
values ('immo_provision_modus', 'anteil_von_kaufpreis')
on conflict (key) do update set value = excluded.value;
