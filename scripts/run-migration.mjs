// Führt eine Migrationsdatei gegen die Projekt-DB aus: node scripts/run-migration.mjs <pfad>
import { readFileSync } from "node:fs";
import pg from "pg";

const file = process.argv[2];
if (!file) { console.error("Aufruf: node scripts/run-migration.mjs <sql-datei>"); process.exit(1); }

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
const sql = readFileSync(file, "utf8");
try {
  await pool.query("begin");
  await pool.query(sql);
  await pool.query("commit");
  console.log("Migration OK:", file);
} catch (e) {
  await pool.query("rollback");
  console.error("Migration FEHLGESCHLAGEN:", e.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
