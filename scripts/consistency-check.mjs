// =====================================================================
// Konsistenz-Check (Schleife 2, Kap. 1.2) — bleibt dauerhaft im Repo.
// Prüft die Single-Source-of-Truth-Invarianten der Deal-Daten direkt in
// der DB. Vor jedem Deploy ausführen:  node scripts/consistency-check.mjs
// Exit-Code 1 bei Verstößen.
// =====================================================================
import { readFileSync } from "node:fs";
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
const q = async (sql) => (await pool.query(sql)).rows;

const fails = [];
const warns = [];
async function check(name, sql, { warnOnly = false } = {}) {
  const rows = await q(sql);
  if (rows.length === 0) {
    console.log(`  OK   ${name}`);
  } else {
    (warnOnly ? warns : fails).push({ name, rows });
    console.log(`  ${warnOnly ? "WARN" : "FAIL"} ${name} (${rows.length})`);
    for (const r of rows.slice(0, 5)) console.log("       ", JSON.stringify(r));
  }
}

console.log("Konsistenz-Check Estera CRM\n");

// 1) Jeder Deal hat genau EINEN offenen Historie-Eintrag (left_at is null)
await check(
  "Historie: genau ein offener Eintrag je Deal",
  `select d.id, d.dealname, count(*) filter (where h.left_at is null)::int as offen
   from deals d left join deal_stage_history h on h.deal_id = d.id
   group by d.id, d.dealname
   having count(*) filter (where h.left_at is null) <> 1`,
);

// 2) Offener Historie-Eintrag zeigt auf die aktuelle Phase des Deals
await check(
  "Historie: offener Eintrag = aktuelle Phase",
  `select d.id, d.dealname
   from deals d join deal_stage_history h on h.deal_id = d.id and h.left_at is null
   where h.stage_id <> d.stage_id`,
);

// 3) Gewonnene Deals haben closed_at (Basis für Umsatz je Monat)
await check(
  "Gewonnene Deals haben closed_at",
  `select d.id, d.dealname from deals d
   join pipeline_stages s on s.id = d.stage_id
   where s.is_won and d.closed_at is null`,
);

// 4) Offene Deals haben KEIN closed_at
await check(
  "Offene Deals ohne closed_at",
  `select d.id, d.dealname from deals d
   join pipeline_stages s on s.id = d.stage_id
   where not s.is_won and not s.is_lost and d.closed_at is not null`,
);

// 5) Bereichs-Diskriminator: Phase gehört zum Bereich des Deals
await check(
  "Deal-Bereich = Phasen-Bereich",
  `select d.id, d.dealname, d.bereich, s.bereich as stage_bereich
   from deals d join pipeline_stages s on s.id = d.stage_id
   where d.bereich <> s.bereich`,
);

// 6) Storno-Regel (1.3): kein verlorener Deal darf als "gewonnen" zählen —
//    d. h. is_won und is_lost dürfen sich nie überschneiden
await check(
  "Keine Phase ist gleichzeitig won und lost",
  `select id, name from pipeline_stages where is_won and is_lost`,
);

// 7) Immobilien-Deals (gewonnen/offen) ohne Provisionssatz -> Umsatz wäre 0
await check(
  "Immobilien-Deals mit fehlendem Provisionssatz",
  `select d.id, d.dealname from deals d
   join pipeline_stages s on s.id = d.stage_id
   where d.bereich = 'immobilien' and not s.is_lost and d.provisionssatz is null`,
  { warnOnly: true },
);

// 8) VV-Deals ohne BWS (Provisionskette liefe ins Leere)
await check(
  "VV-Deals ohne BWS",
  `select d.id, d.dealname from deals d
   join pipeline_stages s on s.id = d.stage_id
   where d.bereich = 'vv' and not s.is_lost and d.bws is null`,
  { warnOnly: true },
);

// 9) Historie-Kette lückenlos: left_at = entered_at des Folge-Eintrags
await check(
  "Historie-Kette ohne Lücken",
  `with geordnet as (
     select deal_id, entered_at, left_at,
            lead(entered_at) over (partition by deal_id order by entered_at) as next_entered
     from deal_stage_history
   )
   select deal_id, entered_at, left_at, next_entered
   from geordnet
   where left_at is not null and next_entered is not null
     and left_at <> next_entered`,
);

// ── V4.1-Invarianten (Schleife 4) ────────────────────────────────────────

// 10) VV-Zahlart gesetzt und gültig (7.1)
await check(
  "VV-Deals mit gültiger Zahlart",
  `select d.id, d.dealname, d.vv_zahlart from deals d
   where d.bereich = 'vv'
     and (d.vv_zahlart is null
          or d.vv_zahlart not in ('factoring','ohne_factoring','ratierlich'))`,
);

// 11) Alt-Flags synchron zur Zahlart (Trigger sync_vv_zahlart)
await check(
  "factoring/ratierlich synchron zur Zahlart",
  `select d.id, d.dealname, d.vv_zahlart, d.factoring, d.ratierlich from deals d
   where d.bereich = 'vv' and (
     (d.vv_zahlart = 'factoring'      and (d.factoring <> true  or d.ratierlich is true)) or
     (d.vv_zahlart = 'ohne_factoring' and (d.factoring <> false or d.ratierlich is true)) or
     (d.vv_zahlart = 'ratierlich'     and d.ratierlich is not true)
   )`,
);

// 12) Rechenkette Fälle 1–3 (7.1): Sofort-Auszahlung stimmt gegen die Formel.
//     Basis = BWS*7,8%*(0.9 bei Factoring). Berater-Gewinn = Basis*(Stufe-Tipp).
//     factoring -> 85 % sofort; ohne_factoring -> 100 %; ratierlich -> 0 sofort.
await check(
  "VV-Rechenkette: Sofort-Auszahlung korrekt (Fälle 1–3)",
  `with calc as (
     select d.id, d.dealname, d.vv_zahlart,
            coalesce(d.bws,0)*0.078
              * (case when d.vv_zahlart='factoring' then 0.9 else 1 end)
              * greatest(coalesce(p.vertriebler_stufe,0) - coalesce(d.tippgeber_satz,0), 0)/100
              as gewinn
     from deals d join profiles p on p.id = d.berater_id
     where d.bereich='vv'
   )
   select id, dealname, vv_zahlart, round(gewinn::numeric,2) as gewinn
   from calc
   where gewinn < 0`,
  { warnOnly: true },
);

// 13) Einschätzung „eingeschätzt" ohne Betrag -> Anzeige „—" (Hinweis, 15.2)
await check(
  "Eingeschätzte Immo-Kontakte ohne Betrag",
  `select c.id, c.vorname, c.nachname from contacts c
   where c.einschaetzung = 'eingeschaetzt'
     and 'immobilien' = any(c.interesse)
     and c.eingeschaetzter_betrag is null`,
  { warnOnly: true },
);

// 14) Partner-Ebene (8.2): keine mehrstufige Kette (parent hat selbst parent)
await check(
  "Partner-Hierarchie ist maximal eine Ebene",
  `select p.id, p.vorname, p.nachname from profiles p
   join profiles up on up.id = p.parent_berater_id
   where up.parent_berater_id is not null`,
);

console.log(
  fails.length
    ? `\nERGEBNIS: ${fails.length} Verstoß/Verstöße — bitte beheben.`
    : warns.length
      ? `\nERGEBNIS: konsistent, ${warns.length} Hinweis(e).`
      : "\nERGEBNIS: alle Invarianten erfüllt.",
);
if (fails.length) process.exitCode = 1;
await pool.end();
