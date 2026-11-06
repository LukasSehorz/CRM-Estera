// NUR LOKAL: spielt die Meta-Schnittstelle (Graph API) nach, damit der
// Lead-Empfang ohne echtes Facebook getestet werden kann.
//   node scripts/lokal/meta-attrappe.mjs            → läuft auf Port 4555
// Neue Test-Leads erzeugt scripts/lokal/testlead.mjs.
import http from "node:http";

const leads = new Map();
const FORMULAR = { id: "LOKAL_FORM", name: "Kapitalanlage – Erstgespräch (Test)" };

http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const u = new URL(req.url, "http://x");
      const send = (code, obj) => {
        res.writeHead(code, { "content-type": "application/json" });
        res.end(JSON.stringify(obj));
      };
      const teile = u.pathname.split("/").filter(Boolean).slice(1); // ohne Version

      // Interner Eingang für testlead.mjs
      if (u.pathname === "/__lead" && req.method === "POST") {
        const l = JSON.parse(body);
        leads.set(l.id, l);
        return send(200, { ok: true });
      }
      if (teile[0] === "LOKAL_SEITE" && teile[1] === "leadgen_forms") return send(200, { data: [FORMULAR] });
      if (teile[0] === FORMULAR.id && teile[1] === "leads") return send(200, { data: [...leads.values()] });
      if (teile[0] === FORMULAR.id) return send(200, FORMULAR);
      if (leads.has(teile[0])) return send(200, leads.get(teile[0]));
      send(404, { error: { message: "Attrappe: unbekannt " + u.pathname } });
    });
  })
  .listen(4555, () => console.log("Meta-Attrappe läuft auf http://localhost:4555"));
