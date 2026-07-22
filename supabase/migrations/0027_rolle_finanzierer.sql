-- =====================================================================
-- 0027 — Neue Rolle „Finanzierer" (Kunden-Feedback 22.07.).
-- Nur der Enum-Wert (muss eigene Transaktion sein; Nutzung erst danach).
-- Der is_finanzierer()-Helper + Freigabe-Konzept folgen in 0028.
-- =====================================================================

alter type public.rolle_enum add value if not exists 'finanzierer';
