// =====================================================================
// Minimaler ZIP-Writer (STORE / ohne Kompression) — dependency-frei, damit
// „Alle als ZIP herunterladen" (14.2) ohne externe Lib und ohne CSP-Bruch
// funktioniert. Erzeugt ein gültiges ZIP-Archiv aus mehreren Dateien.
// Für Kundenunterlagen (PDF/JPG) ist STORE völlig ausreichend.
// =====================================================================

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

type ZipEntry = { name: string; data: Uint8Array };

/** Baut ein STORE-ZIP-Archiv (keine Kompression) als Blob. */
export function buildZip(files: ZipEntry[]): Blob {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const crc = crc32(f.data);
    const size = f.data.length;

    // Local file header (Signatur 0x04034b50)
    const lh = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(lh.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true); // version needed
    lv.setUint16(6, 0x0800, true); // Flag: UTF-8-Dateinamen
    lv.setUint16(8, 0, true); // Methode 0 = STORE
    lv.setUint16(10, 0, true); // Zeit
    lv.setUint16(12, 0, true); // Datum
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true); // komprimiert
    lv.setUint32(22, size, true); // unkomprimiert
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true); // Extra-Feld-Länge
    lh.set(nameBytes, 30);

    chunks.push(lh, f.data);

    // Central directory record (Signatur 0x02014b50)
    const ch = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(ch.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint32(42, offset, true); // Offset des Local Headers
    ch.set(nameBytes, 46);
    central.push(ch);

    offset += lh.length + size;
  }

  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true); // End of central directory
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  // Alle Teile sind ArrayBuffer-gestützte Uint8Arrays -> gültige BlobParts.
  const parts = [...chunks, ...central, eocd] as unknown as BlobPart[];
  return new Blob(parts, { type: "application/zip" });
}

/** Dateinamen im Archiv eindeutig machen (doppelte → „name (2).pdf"). */
export function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot) : "";
  let i = 2;
  let candidate = `${base} (${i})${ext}`;
  while (used.has(candidate)) {
    i++;
    candidate = `${base} (${i})${ext}`;
  }
  used.add(candidate);
  return candidate;
}
