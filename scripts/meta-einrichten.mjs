// Einrichtung der Meta-Lead-Anbindung — EINMALIG, lokal ausführen.
//
//   node scripts/meta-einrichten.mjs <datei> "<Teil des Seitennamens>"
//
// <datei> ist eine Textdatei mit drei Zeilen (wird danach GELÖSCHT):
//   APP_ID=…        App-ID aus developers.facebook.com
//   APP_SECRET=…    App-Geheimcode (App-Einstellungen → Allgemein)
//   USER_TOKEN=…    kurzlebiger Token aus dem Graph-API-Explorer
//
// Was das Skript tut (kein Schlüssel wird ausgegeben):
//  1. tauscht den kurzlebigen Token gegen einen langlebigen
//  2. sucht die Facebook-Seite und holt deren dauerhaften Seiten-Token
//  3. prüft, ob die Sofortformulare der Seite lesbar sind
//  4. meldet die App für neue Leads der Seite an (subscribed_apps: leadgen)
//  5. trägt alle Werte in die Netlify-Umgebung des CRM ein
//  6. meldet den Webhook bei Meta an (Meta prüft dabei die Live-Adresse —
//     geht erst, wenn der Code live ist; sonst später mit --nur-webhook)
//
// Optionen: --lokal               (nur .env.development.local, Live unberührt)
//           --berater=<profil-id>   (Standard: Sebastian Meilbeck)
//           --nur-webhook           (nur Schritt 6, Werte aus Netlify)
import { readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";

const SITE = "cd5b83ef-de69-42e2-972d-56206f08ac28"; // estera-crm (Netlify)
const CRM_URL = "https://estera-crm.netlify.app";
const GRAPH = "https://graph.facebook.com/v27.0";
const SEBASTIAN = "3aad9f2a-ce83-4eba-87ad-7d709059d25b";

const args = process.argv.slice(2);
const flag = (n) => args.find((a) => a.startsWith(`--${n}`));
const [datei, seitenName] = args.filter((a) => !a.startsWith("--"));
const beraterId = flag("berater")?.split("=")[1] || SEBASTIAN;

function fail(msg) {
  console.error("\n✗ " + msg);
  process.exit(1);
}

async function g(path, params = {}, method = "GET") {
  const qs = new URLSearchParams(params);
  const res = await fetch(`${GRAPH}/${path}?${qs}`, { method });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.error) throw new Error(j.error?.message || `HTTP ${res.status}`);
  return j;
}

function netlifySet(key, value) {
  execFileSync("netlify", ["env:set", key, value, "--site", SITE, "--force"], {
    stdio: ["ignore", "ignore", "inherit"],
  });
  console.log(`  ✓ Netlify: ${key} gesetzt`);
}
function netlifyGet(key) {
  try {
    const out = execFileSync("netlify", ["env:get", key, "--site", SITE, "--context", "production"], {
      stdio: ["ignore", "pipe", "ignore"],
    }).toString().trim();
    // Netlify gibt bei fehlendem Wert eine Hinweis-Meldung aus (Exit 0).
    // Echte Werte hier sind Hex-Zeichenketten ohne Leerzeichen.
    return /^[A-Za-z0-9_-]{16,64}$/.test(out) ? out : "";
  } catch {
    return "";
  }
}

async function webhookAnmelden(appId, appSecret, verifyToken) {
  console.log("\n6) Webhook bei Meta anmelden …");
  await g(
    `${appId}/subscriptions`,
    {
      object: "page",
      callback_url: `${CRM_URL}/api/meta/webhook`,
      fields: "leadgen",
      verify_token: verifyToken,
      include_values: "true",
      access_token: `${appId}|${appSecret}`,
    },
    "POST",
  );
  console.log("  ✓ Webhook aktiv: " + `${CRM_URL}/api/meta/webhook`);
}

if (!datei) fail("Aufruf: node scripts/meta-einrichten.mjs <datei> \"<Seitenname>\"");

const env = {};
let roh;
try {
  roh = readFileSync(datei, "utf8");
} catch {
  fail(`Datei ${datei} nicht gefunden.`);
}
for (const line of roh.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+?)\s*$/);
  if (m) env[m[1]] = m[2];
}
const { APP_ID, APP_SECRET, USER_TOKEN } = env;
if (!APP_ID || !APP_SECRET) fail("APP_ID und APP_SECRET fehlen in der Datei.");

try {
  if (flag("nur-webhook")) {
    const vt = netlifyGet("META_VERIFY_TOKEN");
    if (!vt) fail("META_VERIFY_TOKEN ist in Netlify noch nicht gesetzt — erst den vollen Lauf machen.");
    await webhookAnmelden(APP_ID, APP_SECRET, vt);
    if (!datei.endsWith(".env.development.local")) unlinkSync(datei);
    console.log("\n✓ Fertig.");
    process.exit(0);
  }

  if (!USER_TOKEN) fail("USER_TOKEN fehlt in der Datei.");
  if (!seitenName) fail("Seitenname fehlt (zweites Argument).");

  console.log("1) Token verlängern …");
  // Token eines Systemnutzers (Business-Portfolio) läuft nie ab und lässt
  // sich nicht tauschen → dann direkt verwenden.
  let lang = { access_token: USER_TOKEN };
  const info = await g("debug_token", { input_token: USER_TOKEN, access_token: `${APP_ID}|${APP_SECRET}` });
  if (info.data?.type === "SYSTEM_USER" || info.data?.expires_at === 0) {
    console.log("  ✓ dauerhafter Systemnutzer-Token, kein Tausch nötig");
  } else {
    lang = await g("oauth/access_token", {
      grant_type: "fb_exchange_token",
      client_id: APP_ID,
      client_secret: APP_SECRET,
      fb_exchange_token: USER_TOKEN,
    });
    console.log("  ✓ langlebiger Nutzer-Token erhalten");
  }

  console.log("2) Seite suchen …");
  const seiten = [];
  let after;
  do {
    const r = await g("me/accounts", {
      fields: "id,name,access_token,tasks",
      limit: "100",
      access_token: lang.access_token,
      ...(after ? { after } : {}),
    });
    seiten.push(...r.data);
    after = r.paging?.next ? r.paging.cursors?.after : undefined;
  } while (after);
  const treffer = seiten.filter((s) => s.name.toLowerCase().includes(seitenName.toLowerCase()));
  if (treffer.length !== 1) {
    console.log("  Seiten, auf die du Zugriff hast:");
    for (const s of seiten) console.log(`   - ${s.name} (${s.id})`);
    fail(treffer.length ? "Mehrere Treffer — Namen genauer angeben." : `Keine Seite mit „${seitenName}“ gefunden. Hat Sebastian dich auf der Seite eingeladen und hast du angenommen?`);
  }
  const seite = treffer[0];
  console.log(`  ✓ ${seite.name} (${seite.id}), Rechte: ${(seite.tasks || []).join(", ")}`);

  const dauer = await g("debug_token", {
    input_token: seite.access_token,
    access_token: `${APP_ID}|${APP_SECRET}`,
  });
  const ablauf = dauer.data?.expires_at;
  console.log(`  ✓ Seiten-Token ${ablauf ? "läuft ab am " + new Date(ablauf * 1000).toLocaleDateString("de-DE") : "läuft nicht ab"}`);
  const scopes = dauer.data?.scopes || [];
  if (!scopes.includes("leads_retrieval")) fail("Dem Token fehlt die Berechtigung leads_retrieval. Im Graph-API-Explorer anhaken und neu erzeugen.");

  console.log("3) Formulare prüfen …");
  const forms = await g(`${seite.id}/leadgen_forms`, {
    fields: "id,name,status",
    limit: "100",
    access_token: seite.access_token,
  });
  console.log(`  ✓ ${forms.data.length} Formular(e): ${forms.data.map((f) => f.name).join(" · ") || "—"}`);
  if (forms.data[0]) {
    const l = await g(`${forms.data[0].id}/leads`, { limit: "1", fields: "id", access_token: seite.access_token });
    console.log(`  ✓ Leads lesbar (${l.data.length ? "mind. 1 vorhanden" : "noch keine im ersten Formular"})`);
  }

  console.log("4) App für neue Leads der Seite anmelden …");
  await g(`${seite.id}/subscribed_apps`, { subscribed_fields: "leadgen", access_token: seite.access_token }, "POST");
  console.log("  ✓ angemeldet");

  if (flag("lokal")) {
    // Nur auf diesem Mac: echte Meta-Werte in .env.development.local, die
    // Attrappe fliegt raus. Live-Server bleibt unberührt. Die drei Rohwerte
    // wandern mit, damit der spätere Live-Lauf ohne meta.txt geht:
    //   node scripts/meta-einrichten.mjs .env.development.local "ADVIS"
    const pfad = new URL("../.env.development.local", import.meta.url);
    const alt = readFileSync(pfad, "utf8")
      .split("\n")
      .filter((l) => !/^(META_GRAPH_BASE|META_PAGE_ID|META_PAGE_ACCESS_TOKEN|META_APP_SECRET|APP_ID|APP_SECRET|USER_TOKEN)=/.test(l))
      .join("\n");
    writeFileSync(
      pfad,
      `${alt.trimEnd()}\n\n# Echte Meta-Werte (lokal, ${new Date().toLocaleDateString("de-DE")})\n` +
        `META_PAGE_ID=${seite.id}\nMETA_PAGE_ACCESS_TOKEN=${seite.access_token}\nMETA_APP_SECRET=${APP_SECRET}\n` +
        `APP_ID=${APP_ID}\nAPP_SECRET=${APP_SECRET}\nUSER_TOKEN=${USER_TOKEN}\n`,
    );
    unlinkSync(datei);
    console.log(`\n✓ Lokal eingetragen, ${datei} gelöscht. Dev-Server neu starten, dann /api/meta/sync aufrufen.`);
    process.exit(0);
  }

  console.log("5) Werte in Netlify eintragen …");
  const verify = netlifyGet("META_VERIFY_TOKEN") || randomBytes(18).toString("hex");
  const sync = netlifyGet("META_SYNC_SECRET") || randomBytes(24).toString("hex");
  netlifySet("META_PAGE_ID", seite.id);
  netlifySet("META_PAGE_ACCESS_TOKEN", seite.access_token);
  netlifySet("META_APP_SECRET", APP_SECRET);
  netlifySet("META_VERIFY_TOKEN", verify);
  netlifySet("META_SYNC_SECRET", sync);
  netlifySet("META_LEAD_BERATER_ID", beraterId);

  try {
    await webhookAnmelden(APP_ID, APP_SECRET, verify);
  } catch (e) {
    console.log(`  ! Webhook noch nicht angemeldet (${e.message}).`);
    console.log("    Normal, wenn der Code noch nicht live ist. Danach erneut mit --nur-webhook.");
    console.log("    Die Datei bleibt dafür liegen (nur APP_ID/APP_SECRET werden noch gebraucht).");
    process.exit(0);
  }

  if (!datei.endsWith(".env.development.local")) unlinkSync(datei);
  console.log(`\n✓ Fertig. Neu deployen, damit Netlify die Werte übernimmt.`);
} catch (e) {
  fail(`Meta meldet: ${e.message}`);
}
