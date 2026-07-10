// Prüft Login + Änderungszeitpunkte der Demo-Zugänge (wer/wann verstellt?).
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const env = {};
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
function parseDbUrl(url) {
  const noProto = url.replace(/^postgres(ql)?:\/\//, "");
  const at = noProto.lastIndexOf("@");
  const cred = noProto.slice(0, at);
  const rest = noProto.slice(at + 1);
  const colon = cred.indexOf(":");
  const m = rest.match(/^([^:/]+):(\d+)\/(.+?)(\?.*)?$/);
  return {
    host: m[1], port: Number(m[2]), database: m[3],
    user: cred.slice(0, colon), password: decodeURIComponent(cred.slice(colon + 1)),
    ssl: { rejectUnauthorized: false },
  };
}
const pool = new pg.Pool({ ...parseDbUrl(env.SUPABASE_DB_URL), max: 1 });
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const info = await pool.query(
  `select email, updated_at, last_sign_in_at
   from auth.users where email in ('max@estera.test','anna@estera.test') order by email`,
);
for (const r of info.rows) {
  console.log(`${r.email}: Passwort/Konto zuletzt geändert ${r.updated_at?.toISOString()} | letzter Login ${r.last_sign_in_at?.toISOString()}`);
}

for (const [email, pass] of [["max@estera.test", "Estera2026!"], ["anna@estera.test", "Berater2026!"]]) {
  const { data, error } = await anon.auth.signInWithPassword({ email, password: pass });
  console.log(`${email} mit Standard-Passwort: ${error ? "FALSCH (" + error.message + ")" : "OK ✓"}`);
  if (data?.session) await anon.auth.signOut();
}
await pool.end();
