/**
 * Dokument-Zuordnung (Call SJ): jedes Kundendokument gehört zu genau einem
 * Checklisten-Punkt (document_type). Neu hochgeladene Dokumente tragen bereits
 * eine document_type_id; Altbestand aus dem früheren freien Upload wird über
 * die Kategorie gematcht (exakt über den Typnamen oder eine kleine Legacy-
 * Zuordnung), sonst landet es im Sammel-Punkt „Sonstige".
 */
type TypeLite = { id: string; name: string };

// ── Upload-Sicherheit (DSGVO Art. 32) ──────────────────────────────────
//
// Zwei Probleme werden hier gelöst:
//
// 1) Bisher wurde JEDER Dateityp angenommen. Eine hochgeladene HTML- oder
//    SVG-Datei wird beim Öffnen der signierten URL vom Browser AUSGEFÜHRT —
//    auf der Supabase-Domain. Damit ließe sich Schadcode einschleusen oder
//    eine täuschend echte Phishing-Seite unter der Adresse des Systems
//    ausliefern.
//
// 2) Der Content-Type kam bisher vom Client (`file.type`) und war damit frei
//    fälschbar. Wir leiten ihn deshalb IMMER aus der Dateiendung ab und
//    ignorieren die Angabe des Browsers.
//
// Bewusst großzügige Liste: Ausweise werden oft direkt mit dem Handy
// fotografiert (iPhone: HEIC), Nachweise kommen als PDF, Scans als TIFF.
// Office-Dokumente sind erlaubt, weil sie im Browser nicht ausgeführt werden.

/** Erlaubte Endung → verbindlicher Content-Type. */
const ERLAUBTE_TYPEN: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  tif: "image/tiff",
  tiff: "image/tiff",
  bmp: "image/bmp",
  txt: "text/plain",
  csv: "text/csv",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
};

export const ERLAUBTE_ENDUNGEN = Object.keys(ERLAUBTE_TYPEN);

/** `accept`-Attribut für den Datei-Dialog (filtert schon in der Auswahl). */
export const UPLOAD_ACCEPT = ERLAUBTE_ENDUNGEN.map((e) => `.${e}`).join(",");

export type DateiPruefung =
  | { ok: true; contentType: string }
  | { ok: false; grund: string };

/**
 * Prüft eine Datei vor dem Upload und liefert den verbindlichen
 * Content-Type. Niemals `file.type` vertrauen — siehe Kommentar oben.
 */
export function pruefeDatei(dateiname: string): DateiPruefung {
  const endung = dateiname.split(".").pop()?.toLowerCase() ?? "";
  const contentType = ERLAUBTE_TYPEN[endung];
  if (!contentType) {
    return {
      ok: false,
      grund: endung
        ? `Dateityp „.${endung}" ist aus Sicherheitsgründen nicht erlaubt. Zulässig sind PDF, Bilder (JPG, PNG, HEIC …) und Office-Dokumente.`
        : "Datei ohne Endung kann nicht angenommen werden.",
    };
  }
  return { ok: true, contentType };
}

// Alte freie Kategorien, deren Wert NICHT dem Typnamen entspricht.
const LEGACY_KAT: Record<string, string> = {
  Gehaltsabrechnung: "Die letzten drei Gehaltsnachweise (alle Seiten)",
  Ausweis:
    "Personalausweis / Reisepass + Aufenthaltstitel (Vorder- und Rückseite)",
};

/**
 * Prägnanter Kurzname eines (oft langen) Dokumenttyp-Namens.
 * „Personalausweis / Reisepass + Aufenthaltstitel (Vorder- und Rückseite)"
 * → „Personalausweis". Schneidet am ersten Zusatz ab.
 */
export function kurzTypname(name: string): string {
  const s = name
    .split(" (")[0]
    .split(" / ")[0]
    .split(" + ")[0]
    .split(" oder ")[0]
    .trim();
  return s || name;
}

/**
 * Automatischer Anzeigename eines Kundendokuments (Kunden-Feedback 22.07.):
 * Wird eine Datei in einen Checklisten-Slot geladen, heißt sie nach dem Typ
 * (z. B. „Personalausweis"), bei mehreren nummeriert. Ohne Typ bzw. bei
 * „Sonstige" bleibt der Originaldateiname (ohne Endung).
 */
export function dokumentAnzeigename(
  typName: string | null | undefined,
  dateiname: string,
  index = 0,
  anzahl = 1,
): string {
  if (!typName || typName === "Sonstige") {
    return dateiname.replace(/\.[^.]+$/, "");
  }
  const kurz = kurzTypname(typName);
  return anzahl > 1 ? `${kurz} (${index + 1})` : kurz;
}

/**
 * Sub-Typen eines Mehrfach-Slots (Kunden-Feedback 22.07.):
 * „Personalausweis / Reisepass + Aufenthaltstitel (Vorder- und Rückseite)"
 * → ["Personalausweis", "Reisepass", "Aufenthaltstitel"]. Bei nur EINEM
 * Ergebnis gibt es keine Auswahl (Standard-Slot).
 */
export function slotOptionen(typename: string): string[] {
  const kopf = typename.split(" (")[0];
  return kopf
    .split(/ \/ | \+ | oder /)
    .map((s) => s.replace(/^[„"'»]+|[""'«]+$/g, "").trim())
    .filter(Boolean);
}

/** Liefert die document_type_id, unter der ein Dokument einsortiert wird. */
export function resolveDocTypeId(
  doc: { document_type_id: string | null; kategorie: string },
  types: TypeLite[],
): string | null {
  if (doc.document_type_id) return doc.document_type_id;
  const byName = types.find((t) => t.name === doc.kategorie);
  if (byName) return byName.id;
  const mapped = LEGACY_KAT[doc.kategorie];
  if (mapped) {
    const t = types.find((x) => x.name === mapped);
    if (t) return t.id;
  }
  return types.find((t) => t.name === "Sonstige")?.id ?? null;
}

type DocInput = {
  id: string;
  dateiname: string;
  anzeigename?: string | null;
  storage_path: string;
  groesse: number | null;
  created_at: string;
  document_type_id: string | null;
  kategorie: string;
};

export type ResolvedDocFile = {
  id: string;
  dateiname: string;
  anzeigename: string | null;
  storage_path: string;
  groesse: number | null;
  created_at: string;
};

/**
 * Gruppiert alle Kundendokumente nach Checklisten-Punkt — inkl. Altbestand.
 * So zeigt jeder Punkt genau die Dateien, die zu ihm hochgeladen wurden.
 */
export function groupDocsByType(
  docs: DocInput[],
  types: TypeLite[],
): Record<string, ResolvedDocFile[]> {
  const map: Record<string, ResolvedDocFile[]> = {};
  for (const d of docs) {
    const typeId = resolveDocTypeId(d, types);
    if (!typeId) continue;
    (map[typeId] ??= []).push({
      id: d.id,
      dateiname: d.dateiname,
      anzeigename: d.anzeigename ?? null,
      storage_path: d.storage_path,
      groesse: d.groesse,
      created_at: d.created_at,
    });
  }
  return map;
}
