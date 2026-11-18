export interface ZipEntry {
  name: string;
  blob: Blob;
  lastModified?: number;
}

export const MAX_ZIP_BYTES = 4_000_000_000;
export const MAX_ZIP_ENTRIES = 65_000;

const CRC_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crcUpdate(state: number, bytes: Uint8Array): number {
  let c = state;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return c;
}

async function crc32OfBlob(blob: Blob): Promise<number> {
  const CHUNK = 4 * 1024 * 1024;
  let state = 0xffffffff;
  for (let offset = 0; offset < blob.size; offset += CHUNK) {
    const buffer = await blob.slice(offset, Math.min(blob.size, offset + CHUNK)).arrayBuffer();
    state = crcUpdate(state, new Uint8Array(buffer));
  }
  return (state ^ 0xffffffff) >>> 0;
}

function dosDateTime(ms: number): { time: number; date: number } {
  const d = new Date(Number.isFinite(ms) && ms > 0 ? ms : Date.now());
  const year = Math.max(1980, d.getFullYear());
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

function cleanName(name: string): string {
  const cleaned = name
    .replace(/\\/g, "/")
    .replace(/[\u0000-\u001f]/g, "")
    .replace(/^\/+/, "")
    .trim();
  return cleaned.length > 0 ? cleaned : "file";
}

function uniqueName(name: string, used: Set<string>): string {
  const base = cleanName(name);
  if (!used.has(base.toLowerCase())) {
    used.add(base.toLowerCase());
    return base;
  }
  const dot = base.lastIndexOf(".");
  const stem = dot > 0 ? base.slice(0, dot) : base;
  const ext = dot > 0 ? base.slice(dot) : "";
  let n = 2;
  let candidate = `${stem} (${n})${ext}`;
  while (used.has(candidate.toLowerCase())) {
    n += 1;
    candidate = `${stem} (${n})${ext}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

export async function createZip(
  entries: ZipEntry[],
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  if (entries.length === 0) throw new Error("There is nothing to put in the ZIP.");
  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new Error("Too many files for one ZIP. Download them in smaller groups.");
  }
  const totalBytes = entries.reduce((sum, e) => sum + e.blob.size, 0);
  if (totalBytes > MAX_ZIP_BYTES) {
    throw new Error("The ZIP would be larger than 4 GB. Download the files individually instead.");
  }

  const encoder = new TextEncoder();
  const used = new Set<string>();
  const localParts: BlobPart[] = [];
  const centralParts: BlobPart[] = [];
  let offset = 0;
  let centralSize = 0;

  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index];
    const name = uniqueName(entry.name, used);
    const nameBytes = encoder.encode(name);
    const size = entry.blob.size;
    const crc = await crc32OfBlob(entry.blob);
    const { time, date } = dosDateTime(entry.lastModified ?? Date.now());

    const local = new ArrayBuffer(30 + nameBytes.length);
    const lv = new DataView(local);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    new Uint8Array(local, 30).set(nameBytes);

    const central = new ArrayBuffer(46 + nameBytes.length);
    const cv = new DataView(central);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, time, true);
    cv.setUint16(14, date, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    new Uint8Array(central, 46).set(nameBytes);

    localParts.push(local, entry.blob);
    centralParts.push(central);
    offset += local.byteLength + size;
    centralSize += central.byteLength;
    onProgress?.(index + 1, entries.length);
  }

  const end = new ArrayBuffer(22);
  const ev = new DataView(end);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  return new Blob([...localParts, ...centralParts, end], { type: "application/zip" });
}
