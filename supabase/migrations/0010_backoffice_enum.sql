-- =====================================================================
-- 0010 — Rolle „backoffice" (V4.1 Kap. 2.5)
-- Muss separat von 0011 laufen: ein neuer Enum-Wert darf nicht in der
-- selben Transaktion verwendet werden, in der er angelegt wurde.
-- =====================================================================
alter type rolle_enum add value if not exists 'backoffice';
