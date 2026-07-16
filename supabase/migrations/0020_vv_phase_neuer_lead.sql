-- Call SJ (Feedback 16.07.2026): Namenskollision auflösen — das
-- Kunden-SEGMENT heißt „Interessent" (noch kein Deal); wer bereits in der
-- Deal-Pipeline steht, ist ein Kunde in einem frühen Stadium. Die erste
-- VV-Phase heißt darum „Neuer Lead" — konsistent zur Immobilien-Pipeline.
-- Wahrscheinlichkeit (10 %), Position und SLA bleiben unverändert.
update public.pipeline_stages
  set name = 'Neuer Lead'
  where bereich = 'vv' and name = 'Interessent';
