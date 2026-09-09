-- Abschlussmonate Altbestand (Quelle: "estera-abschlussmonate 2" vom Mandanten,
-- eingespielt 09.09.2026).
--
-- Der Mandant hat 35 bereits gewonnene Deals seinerzeit direkt in der
-- Abschlussphase angelegt, als es noch kein Feld fuer das Abschlussdatum gab.
-- Diese Deals standen deshalb ohne closed_at in der DB. Die Liste des
-- Mandanten kennt den Abschluss MONATSGENAU (YYYY-MM) -- der Tag ist NICHT
-- bekannt. Gesetzt wird daher der 15. um 12:00 Ortszeit als neutraler
-- Monatswert; damit kann keine Zeitzone den Monat kippen. Verlaesslich ist
-- der Monat, nicht der Tag.
--
-- Zuordnung ueber deals.id; der Dealname steht zur Kontrolle daneben.
-- Die Bedingung "closed_at is null" macht das Skript wiederholbar und
-- schuetzt bereits gepflegte Daten vor dem Ueberschreiben.
--
-- WIRKUNG: Diese Deals zaehlen ab jetzt in Umsatz, Zielerreichung und
-- Provisions-Einbehalt der jeweiligen Monate (Okt 2025 bis Mai 2026).
-- Das ist beabsichtigt -- vorher fehlten sie in jeder Auswertung.

begin;

-- 2025-10  Armend Bajraj  (Kunde: Armend Bajraj)
update deals set closed_at = '2025-10-15 12:00:00+02'
 where id = '5523fb96-e930-4254-8718-53402103b0ad' and closed_at is null;

-- 2025-10  Fabienne Rodigast  (Kunde: Fabienne Rodigast)
update deals set closed_at = '2025-10-15 12:00:00+02'
 where id = '2e39ede7-6d53-4681-b0f3-eead3d6c2b24' and closed_at is null;

-- 2025-10  Hasan Yediler  (Kunde: Hasan Yediler)
update deals set closed_at = '2025-10-15 12:00:00+02'
 where id = 'cf522fc2-46ad-4714-9944-077756525733' and closed_at is null;

-- 2025-11  Johannes Strasser  (Kunde: Johannes Strasser)
update deals set closed_at = '2025-11-15 12:00:00+02'
 where id = '6da6b6be-fe07-46b2-b54e-272e09135490' and closed_at is null;

-- 2025-11  Thanos .  (Kunde: Thanos Zempilis)
update deals set closed_at = '2025-11-15 12:00:00+02'
 where id = '56448162-5dd1-4201-b3ae-1f105da3d20d' and closed_at is null;

-- 2025-12  Aggelos .  (Kunde: Aggelos Poulios)
update deals set closed_at = '2025-12-15 12:00:00+02'
 where id = '4959a1c3-e920-42c4-adc1-c0e4937ccae2' and closed_at is null;

-- 2025-12  Asslan von Jojo  (Kunde: Asslan Salihu)
update deals set closed_at = '2025-12-15 12:00:00+02'
 where id = 'c23d9945-d663-4e4c-9b0c-fd2c845f5427' and closed_at is null;

-- 2025-12  Carsten Gerhart  (Kunde: Carsten Gerhart)
update deals set closed_at = '2025-12-15 12:00:00+02'
 where id = '36b79eea-dad4-40ec-af2c-0fa1a78e44c3' and closed_at is null;

-- 2025-12  Filip Rumäner  (Kunde: Filip Ciorca)
update deals set closed_at = '2025-12-15 12:00:00+02'
 where id = '9501e47f-e015-4711-a2a1-b336e81ed187' and closed_at is null;

-- 2025-12  Jeejo Hassan Friseur von jojo  (Kunde: Jeejo Hassan)
update deals set closed_at = '2025-12-15 12:00:00+02'
 where id = '72efd7eb-e85a-4296-a67a-78ee3a4a913c' and closed_at is null;

-- 2025-12  michi bauer  (Kunde: Michael Bauer)
update deals set closed_at = '2025-12-15 12:00:00+02'
 where id = '73ff6208-5c81-4b72-a349-8bea0bccf6d0' and closed_at is null;

-- 2025-12  Nikita .  (Kunde: Nikita Gubenko)
update deals set closed_at = '2025-12-15 12:00:00+02'
 where id = '3ab8cb97-9ff7-4273-bfb3-020cb4f7b6e4' and closed_at is null;

-- 2025-12  nikola von emil  (Kunde: Nikola Malizdan)
update deals set closed_at = '2025-12-15 12:00:00+02'
 where id = '17e6b1a4-9f69-4646-88cf-c3d7063263a5' and closed_at is null;

-- 2025-12  Noni (Schwester Jojo)  (Kunde: Antonia Strasser)
update deals set closed_at = '2025-12-15 12:00:00+02'
 where id = '05bb6e85-14b7-45bf-9087-38e5285d5ced' and closed_at is null;

-- 2025-12  Tobi Grathwohl  (Kunde: Tobi Grathwohl)
update deals set closed_at = '2025-12-15 12:00:00+02'
 where id = 'c77b7260-2627-45c2-9246-df6ba3e3d07c' and closed_at is null;

-- 2025-12  Younes Karali  (Kunde: Younes Karali)
update deals set closed_at = '2025-12-15 12:00:00+02'
 where id = '5cb5a1e6-7da0-4144-8d0b-480acd4683e2' and closed_at is null;

-- 2025-12  Yusuf .  (Kunde: Yusuf Cakiroglu)
update deals set closed_at = '2025-12-15 12:00:00+02'
 where id = '6388b85e-1f7b-4163-80ab-f7ad10b14cb9' and closed_at is null;

-- 2026-01  Esteban von Emil  (Kunde: Esteban Mauerer)
update deals set closed_at = '2026-01-15 12:00:00+02'
 where id = '5cf8d652-5bc5-4717-96e1-a921132dac95' and closed_at is null;

-- 2026-01  Kasandra von Emil  (Kunde: Casandra Simon)
update deals set closed_at = '2026-01-15 12:00:00+02'
 where id = '59c67b70-9350-4363-a4c1-7a107cfc38da' and closed_at is null;

-- 2026-01  Larissa von Younes  (Kunde: Larissa Ivan)
update deals set closed_at = '2026-01-15 12:00:00+02'
 where id = '9cb633dd-5d12-4e7e-bd4c-7a77abbcce1b' and closed_at is null;

-- 2026-02  Janni Savidis  (Kunde: Janni Savvidis)
update deals set closed_at = '2026-02-15 12:00:00+02'
 where id = 'bea50d02-4879-4dc1-86c4-75a088cd1f90' and closed_at is null;

-- 2026-03  annalisa von emil  (Kunde: Annalisa Wiedmann)
update deals set closed_at = '2026-03-15 12:00:00+02'
 where id = 'b62c454e-19f4-4c39-94b4-1c91db21c577' and closed_at is null;

-- 2026-03  Cristina von emil  (Kunde: Cristina Drougas)
update deals set closed_at = '2026-03-15 12:00:00+02'
 where id = 'cad396ac-0dcf-4b32-b655-fa4beb6eb966' and closed_at is null;

-- 2026-03  emil .  (Kunde: Emil Buccioni)
update deals set closed_at = '2026-03-15 12:00:00+02'
 where id = '351c5804-58ce-4d4b-94e7-a7f4ac3fe239' and closed_at is null;

-- 2026-03  Florent Krasniqi  (Kunde: Florent Krasniqi)
update deals set closed_at = '2026-03-15 12:00:00+02'
 where id = '5f3d0540-3791-4070-9f22-ff1bae916849' and closed_at is null;

-- 2026-03  Musti .  (Kunde: Mustafa Najjar)
update deals set closed_at = '2026-03-15 12:00:00+02'
 where id = '5888d6db-e656-45f0-87b6-f9c84b92780d' and closed_at is null;

-- 2026-03  Sezer Fidan  (Kunde: Sezer Fidan)
update deals set closed_at = '2026-03-15 12:00:00+02'
 where id = '455a3fc4-bcbe-481b-b671-fdf6d38a3e42' and closed_at is null;

-- 2026-03  valanti .  (Kunde: Valanti Savvidis)
update deals set closed_at = '2026-03-15 12:00:00+02'
 where id = 'b8c36e61-23a7-47e0-bdc7-fc6d054c0dac' and closed_at is null;

-- 2026-04  Analisa von janine  (Kunde: Annabel Schwarz)
update deals set closed_at = '2026-04-15 12:00:00+02'
 where id = '0cfd8ade-87c9-4e47-af51-84e0cd8e85c8' and closed_at is null;

-- 2026-04  Asiate von Emil  (Kunde: Jiraphat Tschaikowski)
update deals set closed_at = '2026-04-15 12:00:00+02'
 where id = '1578e470-96f0-4a76-ae89-dd372587584c' and closed_at is null;

-- 2026-04  Erol Icer  (Kunde: Erol Icer)
update deals set closed_at = '2026-04-15 12:00:00+02'
 where id = 'f2f6ef79-30d8-440c-8eb2-65f5b0e0f6f2' and closed_at is null;

-- 2026-04  Sandro .  (Kunde: Sandro Horn)
update deals set closed_at = '2026-04-15 12:00:00+02'
 where id = 'd12e5080-714e-4b5c-ae52-0076ba4bbc25' and closed_at is null;

-- 2026-04  Türkin .  (Kunde: Aleyna Özkan)
update deals set closed_at = '2026-04-15 12:00:00+02'
 where id = '5f46b7e9-2f20-4d9d-9009-98b9c49cb3b2' and closed_at is null;

-- 2026-05  Gabriel von Younes  (Kunde: Gabriel Todorov)
update deals set closed_at = '2026-05-15 12:00:00+02'
 where id = '59bfb186-5080-4dc1-9dbb-453416e56b48' and closed_at is null;

-- 2026-05  Melisa Cilingiroglu  (Kunde: Melissa Cilingiroglu)
update deals set closed_at = '2026-05-15 12:00:00+02'
 where id = '254447f5-fd7d-4a5a-a938-4cbac27f383c' and closed_at is null;

-- Kontrolle: muss 35 ergeben (bzw. 0 offene aus dieser Liste)
select count(*) as noch_ohne_datum
  from deals d
  join pipeline_stages s on s.id = d.stage_id
 where s.is_won and d.closed_at is null;

commit;
