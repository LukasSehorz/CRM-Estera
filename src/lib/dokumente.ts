/**
 * Dokument-Zuordnung (Call SJ): jedes Kundendokument gehört zu genau einem
 * Checklisten-Punkt (document_type). Neu hochgeladene Dokumente tragen bereits
 * eine document_type_id; Altbestand aus dem früheren freien Upload wird über
 * die Kategorie gematcht (exakt über den Typnamen oder eine kleine Legacy-
 * Zuordnung), sonst landet es im Sammel-Punkt „Sonstige".
 */
type TypeLite = { id: string; name: string };

// Alte freie Kategorien, deren Wert NICHT dem Typnamen entspricht.
const LEGACY_KAT: Record<string, string> = {
  Gehaltsabrechnung: "Die letzten drei Gehaltsnachweise (alle Seiten)",
  Ausweis:
    "Personalausweis / Reisepass + Aufenthaltstitel (Vorder- und Rückseite)",
};

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
  storage_path: string;
  groesse: number | null;
  created_at: string;
  document_type_id: string | null;
  kategorie: string;
};

export type ResolvedDocFile = {
  id: string;
  dateiname: string;
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
      storage_path: d.storage_path,
      groesse: d.groesse,
      created_at: d.created_at,
    });
  }
  return map;
}
