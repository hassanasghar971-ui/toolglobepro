/**
 * zip-core.ts
 * Minimal store-only (no compression) ZIP writer. Runs entirely in the browser.
 * Images are already compressed, so "store" is the right method and keeps this
 * tiny and fast. Output stays below 4 GB, so ZIP64 is not required.
 */

export const MAX_ZIP_BYTES = 4_000_000_000;
export const MAX_ZIP_ENTRIES = 10_000;

export interface ZipEntry {
  name: string;
  blob: Blob;
  /** Milliseconds since epoch. Defaults to now. */
  lastModified?: number;
}

let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  crcTable = table;
  return table;
}

function crcUpdate(crc: number, data: Uint8Array): number {
  const table = getCrcTable();
  let c = crc;
  for (let i = 0; i < data.length; i++) {
    c = table[(c ^ data[i]) & 0xff] ^ (c >>> 8);
  }
  return c;
}

const CRC_CHUNK = 4 * 1024 * 1024;

async function crcOfBlob(
  blob: Blob,
  onBytes: (count: number) => void,
): Promise<number> {
  let crc = 0xffffffff;
  if (typeof blob.stream === "function") {
    const reader = blob.stream().getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.length > 0) {
        crc = crcUpdate(crc, value);
        onBytes(value.length);
      }
    }
  } else {
    for (let offset = 0; offset < blob.size; offset += CRC_CHUNK) {
      const slice = blob.slice(offset, Math.min(blob.size, offset + CRC_CHUNK));
      const bytes = new Uint8Array(await slice.arrayBuffer());
      crc = crcUpdate(crc, bytes);
      onBytes(bytes.length);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(ms: number): { time: number; date: number } {
  let d = new Date(ms);
  if (Number.isNaN(d.getTime())) d = new Date();
  let year = d.getFullYear();
  if (year < 1980) year = 1980;
  if (year > 2107) year = 2107;
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

function safeName(raw: string): string {
  let name = raw
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/^\.+/, "")
    .trim();
  if (!name) name = "file";
  if (name.length > 200) {
    const dot = name.lastIndexOf(".");
    const ext = dot > 0 && name.length - dot <= 10 ? name.slice(dot) : "";
    name = name.slice(0, 200 - ext.length) + ext;
  }
  return name;
}

function uniqueNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map((raw) => {
    const base = safeName(raw);
    let candidate = base;
    let counter = 2;
    while (used.has(candidate.toLowerCase())) {
      const dot = base.lastIndexOf(".");
      candidate =
        dot > 0
          ? `${base.slice(0, dot)} (${counter})${base.slice(dot)}`
          : `${base} (${counter})`;
      counter++;
    }
    used.add(candidate.toLowerCase());
    return candidate;
  });
}

/**
 * Builds a ZIP file from the given entries.
 * onProgress receives a fraction between 0 and 1.
 */
export async function createZip(
  entries: ZipEntry[],
  onProgress?: (fraction: number) => void,
): Promise<Blob> {
  if (entries.length === 0) {
    throw new Error("There are no files to add to the ZIP.");
  }
  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new Error(
      `A ZIP can hold at most ${MAX_ZIP_ENTRIES.toLocaleString()} files.`,
    );
  }

  let totalBytes = 0;
  for (const entry of entries) totalBytes += entry.blob.size;
  if (totalBytes > MAX_ZIP_BYTES) {
    throw new Error(
      "The combined size is above 4 GB, which is the limit for a single ZIP. Download the files individually instead.",
    );
  }

  const names = uniqueNames(entries.map((e) => e.name));
  const encoder = new TextEncoder();
  const body: BlobPart[] = [];
  const central: BlobPart[] = [];
  let offset = 0;
  let centralSize = 0;
  let processed = 0;
  const denominator = Math.max(1, totalBytes);

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const size = entry.blob.size;
    const nameBytes = encoder.encode(names[i]);
    const { time, date } = dosDateTime(entry.lastModified ?? Date.now());

    const crc = await crcOfBlob(entry.blob, (count) => {
      processed += count;
      onProgress?.(Math.min(1, processed / denominator));
    });

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8 file names
    lv.setUint16(8, 0, true); // stored
    lv.setUint16(10, time, true);
    lv.setUint16(12, date, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);

    const header = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(header.buffer);
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
    header.set(nameBytes, 46);

    body.push(local, entry.blob);
    central.push(header);
    centralSize += header.length;
    offset += local.length + size;

    if (offset > MAX_ZIP_BYTES) {
      throw new Error("The ZIP would be larger than 4 GB. Download the files individually instead.");
    }
  }

  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  onProgress?.(1);
  return new Blob([...body, ...central, end], { type: "application/zip" });
}
