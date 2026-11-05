# Meta-Leads → CRM (Sofortformulare)

Leads aus Facebook-/Instagram-Werbeanzeigen mit Sofortformular landen automatisch
als Kontakt im CRM (Status „Neu“, Leadquelle Facebook/Instagram), mit Kampagne,
Anzeige und Formular am Kontakt und allen Formular-Antworten in der Timeline.
Der zuständige Berater bekommt eine Benachrichtigung im CRM und – wenn
`RESEND_API_KEY` gesetzt ist – eine Mail.

## Ablauf

- **Webhook** `POST /api/meta/webhook` – Meta meldet neue Leads sofort.
  Nur Aufrufe mit gültiger Signatur (`META_APP_SECRET`) werden verarbeitet.
- **Abgleich** `POST /api/meta/sync` – alle 5 Minuten über die Netlify-Zeitplan-
  Funktion `netlify/functions/meta-lead-abgleich.mts`. Holt die Leads der letzten
  48 Stunden und legt fehlende an. Nachholen älterer Leads: `?stunden=…`
  (Meta hält Leads 90 Tage vor). Geschützt mit `META_SYNC_SECRET`.
- Doppelte sind ausgeschlossen: `contacts.meta_lead_id` ist eindeutig (0040).
- Code: `src/lib/meta-leads.ts`.

## Umgebungsvariablen (Netlify)

| Name | Inhalt |
|---|---|
| META_PAGE_ID | Facebook-Seite, unter der die Anzeigen laufen |
| META_PAGE_ACCESS_TOKEN | dauerhafter Seiten-Token (leads_retrieval) |
| META_APP_SECRET | App-Geheimcode der Meta-App |
| META_VERIFY_TOKEN | frei gewählt, für die Webhook-Bestätigung |
| META_SYNC_SECRET | frei gewählt, schützt den Abgleich |
| META_LEAD_BERATER_ID | Profil-ID, die neue Leads bekommt |
| META_LEAD_INTERESSE | optional: `vv`, `immobilien` oder beides mit Komma |
| META_LEAD_MAIL_TO | optional: Mail-Empfänger (sonst Login-Mail des Beraters) |
| RESEND_API_KEY / META_LEAD_MAIL_FROM | optional: Mail-Versand |

Einrichtung einmalig mit `scripts/meta-einrichten.mjs` (Anleitung im Kopf der Datei).
