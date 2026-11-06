// NUR LOKAL: baut die Test-Datenbank (lokale Supabase in Docker) auf.
//   1. alle Migrationen in Reihenfolge (0001, 0002, Seed-Phasen, Rest)
//   2. Testkonten: Geschäftsführung + Berater (erfundene Personen)
//   3. ein paar erfundene Kontakte, damit die Listen nicht leer sind
//   4. schreibt .env.development.local (lokale Schlüssel, Dev-Login, Meta-Attrappe)
//
// Voraussetzung: `npx supabase start` im Ordner ~/estera-lokal-db läuft.
// Aufruf: node scripts/lokal/db-aufsetzen.mjs   (wiederholbar: --neu setzt alles zurück)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { homedir } from "node:os";
import pg from "pg";

const DB = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const neu = process.argv.includes("--neu");

// Lokale Schlüssel aus der laufenden Supabase holen (keine echten Geheimnisse).
const status = execFileSync("npx", ["-y", "supabase@latest", "status", "-o", "env"], {
  cwd: `${homedir()}/estera-lokal-db`,
  stdio: ["ignore", "pipe", "ignore"],
}).toString();
const st = Object.fromEntries(
  status.split("\n").map((l) => l.match(/^([A-Z_]+)="?(.*?)"?$/)).filter(Boolean).map((m) => [m[1], m[2]]),
);
const API = st.API_URL || "http://127.0.0.1:54321";
const ANON = st.ANON_KEY;
const SERVICE = st.SERVICE_ROLE_KEY;
if (!ANON || !SERVICE) throw new Error("Lokale Supabase läuft nicht (supabase status ohne Schlüssel).");

const client = new pg.Client({ connectionString: DB });
await client.connect();

if (neu) {
  await client.query("drop schema public cascade; create schema public; grant all on schema public to postgres, anon, authenticated, service_role;");
  await client.query("delete from auth.users");
  console.log("Zurückgesetzt.");
}

const { rows: hat } = await client.query("select to_regclass('public.contacts') as t");
if (!hat[0].t) {
  const dir = new URL("../../supabase/migrations/", import.meta.url);
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql") && f !== "seed.sql").sort();
  const reihenfolge = [files[0], files[1], "seed.sql", ...files.slice(2)];
  for (const f of reihenfolge) {
    let sql = readFileSync(new URL(f, dir), "utf8");
    if (f === "seed.sql") sql = sql.split(/-- BERATER/)[0]; // nur Pipeline-Phasen
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("commit");
      console.log("  ✓", f);
    } catch (e) {
      await client.query("rollback");
      throw new Error(`${f}: ${e.message}`);
    }
  }
}

// Testkonten über die Auth-API der lokalen Supabase anlegen.
async function konto(email, password) {
  const h = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
  const res = await fetch(`${API}/auth/v1/admin/users`, {
    method: "POST",
    headers: h,
    body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const j = await res.json();
  if (res.ok) return j.id;
  // existiert schon → Passwort neu setzen
  const { rows } = await client.query("select id from auth.users where email=$1", [email]);
  if (!rows[0]) throw new Error(`Konto ${email}: ${JSON.stringify(j)}`);
  await fetch(`${API}/auth/v1/admin/users/${rows[0].id}`, {
    method: "PUT",
    headers: h,
    body: JSON.stringify({ password }),
  });
  return rows[0].id;
}

const gfPass = randomBytes(12).toString("hex");
const beraterPass = randomBytes(12).toString("hex");
const gfId = await konto("test-gf@estera.local", gfPass);
const beraterId = await konto("test-berater@estera.local", beraterPass);

await client.query(
  `insert into profiles (id, vorname, nachname, rolle, bereich, aktiv)
   values ($1,'Test','Geschäftsführung','geschaeftsfuehrung','{immobilien,vv}',true),
          ($2,'Test','Berater','berater','{immobilien,vv}',true)
   on conflict (id) do update set rolle = excluded.rolle, aktiv = true`,
  [gfId, beraterId],
);

const { rows: anz } = await client.query("select count(*)::int n from contacts");
if (anz[0].n === 0) {
  const demo = [
    ["Anna", "Beispiel", "Empfehlung", "{vv}", gfId],
    ["Bernd", "Muster", "Webseite", "{immobilien}", gfId],
    ["Clara", "Probe", "Kooperationen", "{vv}", beraterId],
    ["Dieter", "Test", "Sonstige", "{immobilien,vv}", beraterId],
  ];
  for (const [v, n, q, i, b] of demo) {
    await client.query(
      `insert into contacts (vorname, nachname, email, telefon, leadquelle, interesse, berater_id)
       values ($1,$2,$3,'+49 170 0000000',$4,$5,$6)`,
      [v, n, `${v.toLowerCase()}@example.invalid`, q, i, b],
    );
  }
  console.log("  ✓ 4 erfundene Kontakte");
}
await client.end();

const env = `# NUR LOKAL — von scripts/lokal/db-aufsetzen.mjs erzeugt. Nie committen.
# Überschreibt beim \`next dev\` die Werte aus .env.local (Live-Datenbank).
NEXT_PUBLIC_SUPABASE_URL=${API}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE}
SUPABASE_DB_URL=${DB}
NEXT_PUBLIC_SITE_URL=http://localhost:3000

DEV_LOGIN_EMAIL=test-gf@estera.local
DEV_LOGIN_PASSWORD=${gfPass}
DEV_LOGIN_BERATER_EMAIL=test-berater@estera.local
DEV_LOGIN_BERATER_PASSWORD=${beraterPass}

# Meta-Attrappe (scripts/lokal/meta-attrappe.mjs) statt echtem Facebook
META_GRAPH_BASE=http://localhost:4555
META_PAGE_ID=LOKAL_SEITE
META_PAGE_ACCESS_TOKEN=lokal
META_APP_SECRET=lokal-app-secret
META_VERIFY_TOKEN=lokal-verify
META_SYNC_SECRET=lokal-sync
META_LEAD_BERATER_ID=${gfId}
`;
writeFileSync(new URL("../../.env.development.local", import.meta.url), env);
console.log("\n✓ Fertig. .env.development.local geschrieben.");
console.log("  Geschäftsführung: http://localhost:3000/dev-login");
console.log("  Berater:          http://localhost:3000/dev-login?als=berater");
