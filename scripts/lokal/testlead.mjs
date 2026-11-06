// NUR LOKAL: erzeugt einen erfundenen Lead in der Meta-Attrappe und meldet ihn
// signiert an den Webhook von localhost — genau wie Meta es später tut.
//   node scripts/lokal/testlead.mjs              → zufälliger Lead (Facebook/Instagram)
//   node scripts/lokal/testlead.mjs "Max Muster" → mit diesem Namen
import { createHmac, randomInt } from "node:crypto";

const CRM = "http://localhost:3000";
const SECRET = "lokal-app-secret"; // = META_APP_SECRET in .env.development.local

const vornamen = ["Julia", "Markus", "Sabine", "Thomas", "Laura", "Stefan", "Petra", "Michael"];
const nachnamen = ["Huber", "Bauer", "Schneider", "Wagner", "Becker", "Hofmann", "Koch", "Richter"];
const name = process.argv[2] || `${vornamen[randomInt(8)]} ${nachnamen[randomInt(8)]}`;
const id = `lokal-${Date.now()}`;
const ig = randomInt(2) === 1;

const lead = {
  id,
  created_time: new Date().toISOString(),
  form_id: "LOKAL_FORM",
  platform: ig ? "ig" : "fb",
  is_organic: false,
  ad_name: ig ? "Reel – 100 € im Monat" : "Bild – Vermögen aufbauen",
  adset_name: "DE 30–55 Angestellte",
  campaign_name: "ADVIS Leads November",
  field_data: [
    { name: "full_name", values: [name] },
    { name: "email", values: [`${name.split(" ")[0].toLowerCase()}@example.invalid`] },
    { name: "phone_number", values: [`+49 151 ${randomInt(1000000, 9999999)}`] },
    { name: "wie_viel_möchten_sie_monatlich_anlegen?", values: [["100_–_250_€", "250_–_500_€", "über_500_€"][randomInt(3)]] },
    { name: "wann_sind_sie_am_besten_erreichbar?", values: [["vormittags", "nachmittags", "abends"][randomInt(3)]] },
  ],
};

await fetch("http://localhost:4555/__lead", { method: "POST", body: JSON.stringify(lead) });

const body = JSON.stringify({
  object: "page",
  entry: [{ id: "LOKAL_SEITE", time: Date.now(), changes: [{ field: "leadgen", value: { leadgen_id: id, page_id: "LOKAL_SEITE", form_id: "LOKAL_FORM" } }] }],
});
const sig = "sha256=" + createHmac("sha256", SECRET).update(body).digest("hex");
const res = await fetch(`${CRM}/api/meta/webhook`, {
  method: "POST",
  headers: { "content-type": "application/json", "x-hub-signature-256": sig },
  body,
});
console.log(`Test-Lead „${name}“ (${ig ? "Instagram" : "Facebook"}) gesendet → ${res.status}`);
