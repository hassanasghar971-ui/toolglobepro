export interface MetaField {
  label: string;
  value: string;
  sensitive: boolean;
}

export interface RemovedItem {
  kind: string;
  label: string;
  bytes: number;
  count: number;
}

export interface MetaReport {
  format: string;
  fields: MetaField[];
  removed: RemovedItem[];
  orientation: number;
  orientationOnly: boolean;
  hasGps: boolean;
}

export interface MetaRequest {
  type: string;
  id: number;
  file: File;
  keepOrientation: boolean;
}

export interface MetaReply {
  ok: boolean;
  id: number;
  message: string;
  report: MetaReport;
  leftover: number;
  outputSize: number;
  blob?: Blob;
}

export interface Piece {
  start: number;
  end: number;
  bytes?: Uint8Array;
}

interface Analysis {
  report: MetaReport;
  pieces: Piece[];
  mime: string;
}

interface ExifSummary {
  fields: MetaField[];
  orientation: number;
  ifd0Count: number;
  hasSubIfd: boolean;
}

interface IfdEntry {
  tag: number;
  type: number;
  count: number;
  slot: number;
  where: number;
}

interface TagDef {
  tag: number;
  label: string;
  sensitive: boolean;
}

export const MAX_FILE_BYTES = 600 * 1024 * 1024;
export const MAX_FILES = 200;
export const ACCEPT_ATTRIBUTE = "image/jpeg,image/png,image/webp,.jpg,.jpeg,.jpe,.jfif,.png,.webp";

export const UNSUPPORTED_MESSAGE =
  "This file is not a JPG, PNG or WebP image. HEIC, TIFF, RAW and GIF files are not supported yet.";
export const DAMAGED_MESSAGE =
  "This image file looks damaged or cut short, so its metadata could not be read safely.";

const SUPPORTED_TYPES: string[] = ["image/jpeg", "image/png", "image/webp"];
const SUPPORTED_EXTENSIONS: string[] = ["jpg", "jpeg", "jpe", "jfif", "png", "webp"];
const JPEG_EXTENSIONS: string[] = ["jpg", "jpeg", "jpe", "jfif"];
const PNG_EXTENSIONS: string[] = ["png"];
const WEBP_EXTENSIONS: string[] = ["webp"];

const PNG_KEEP: string[] = [
  "IHDR",
  "PLTE",
  "IDAT",
  "IEND",
  "tRNS",
  "gAMA",
  "cHRM",
  "sRGB",
  "iCCP",
  "sBIT",
  "pHYs",
  "bKGD",
  "hIST",
  "acTL",
  "fcTL",
  "fdAT",
  "cICP",
  "mDCV",
  "cLLI",
];
const PNG_TEXT: string[] = ["tEXt", "zTXt", "iTXt"];
const WEBP_KEEP: string[] = ["VP8 ", "VP8L", "VP8X", "ALPH", "ANIM", "ANMF", "ICCP"];

const SCAN_CHUNK = 4 * 1024 * 1024;
const MAX_META_READ = 1048576;
const MAX_APP_BYTES = 65535;
const TYPE_SIZES: number[] = [0, 1, 1, 2, 4, 8, 1, 1, 2, 4, 8, 4, 8];

const IFD0_TAGS: TagDef[] = [
  { tag: 0x010e, label: "Description", sensitive: false },
  { tag: 0x010f, label: "Camera make", sensitive: false },
  { tag: 0x0110, label: "Camera model", sensitive: false },
  { tag: 0x0131, label: "Software", sensitive: false },
  { tag: 0x0132, label: "Date and time", sensitive: false },
  { tag: 0x013b, label: "Artist", sensitive: true },
  { tag: 0x8298, label: "Copyright", sensitive: true },
];

const EXIF_TAGS: TagDef[] = [
  { tag: 0x9003, label: "Date taken", sensitive: false },
  { tag: 0xa430, label: "Owner name", sensitive: true },
  { tag: 0xa431, label: "Camera serial number", sensitive: true },
  { tag: 0xa434, label: "Lens model", sensitive: false },
  { tag: 0xa435, label: "Lens serial number", sensitive: true },
];

export function describeError(error: unknown): string {
  return error instanceof Error && error.message !== "" ? error.message : "Something went wrong. Please try again.";
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  const digits = index === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[index] ?? "B"}`;
}

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

export function isSupportedFile(file: File): boolean {
  if (SUPPORTED_TYPES.includes(file.type)) return true;
  return SUPPORTED_EXTENSIONS.includes(extensionOf(file.name));
}

export function cleanFileName(original: string, format: string, used: Set<string>): string {
  const dot = original.lastIndexOf(".");
  const stem = (dot > 0 ? original.slice(0, dot) : original).replace(/[\\/:*?"<>]/g, "-").trim();
  const base = stem === "" ? "photo" : stem;
  const allowed = format === "JPEG" ? JPEG_EXTENSIONS : format === "PNG" ? PNG_EXTENSIONS : WEBP_EXTENSIONS;
  const original_ext = extensionOf(original);
  const ext = allowed.includes(original_ext) ? original_ext : (allowed[0] ?? "jpg");
  let name = `${base}-clean.${ext}`;
  let counter = 1;
  while (used.has(name.toLowerCase())) {
    name = `${base}-clean-${counter}.${ext}`;
    counter += 1;
  }
  used.add(name.toLowerCase());
  return name;
}

function emptyReport(format: string): MetaReport {
  return { format, fields: [], removed: [], orientation: 0, orientationOnly: false, hasGps: false };
}

function noteRemoved(report: MetaReport, kind: string, label: string, bytes: number): void {
  const found = report.removed.find((r) => r.kind === kind && r.label === label);
  if (found) {
    found.bytes += bytes;
    found.count += 1;
    return;
  }
  report.removed.push({ kind, label, bytes, count: 1 });
}

async function readBytes(source: Blob, start: number, length: number): Promise<Uint8Array> {
  const end = Math.min(source.size, start + length);
  if (end <= start) return new Uint8Array(0);
  const buffer = await source.slice(start, end).arrayBuffer();
  return new Uint8Array(buffer);
}

function asciiAt(bytes: Uint8Array, start: number, length: number): string {
  let out = "";
  const end = Math.min(bytes.length, start + length);
  for (let i = start; i < end; i += 1) {
    out += String.fromCharCode(bytes[i] ?? 0);
  }
  return out;
}

function startsWithText(bytes: Uint8Array, text: string): boolean {
  if (bytes.length < text.length) return false;
  for (let i = 0; i < text.length; i += 1) {
    if (bytes[i] !== text.charCodeAt(i)) return false;
  }
  return true;
}

function readText(data: Uint8Array, start: number, count: number): string {
  if (start < 0 || start >= data.length) return "";
  const end = Math.min(data.length, start + Math.min(count, 200));
  let out = "";
  for (let i = start; i < end; i += 1) {
    const c = data[i] ?? 0;
    if (c === 0) break;
    if (c >= 32 && c < 127) out += String.fromCharCode(c);
    else if (c >= 160) out += String.fromCharCode(c);
  }
  return out.trim();
}

function readU32Be(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) * 16777216 +
    (bytes[offset + 1] ?? 0) * 65536 +
    (bytes[offset + 2] ?? 0) * 256 +
    (bytes[offset + 3] ?? 0)
  );
}

function readU32Le(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0) +
    (bytes[offset + 1] ?? 0) * 256 +
    (bytes[offset + 2] ?? 0) * 65536 +
    (bytes[offset + 3] ?? 0) * 16777216
  );
}

function addRange(pieces: Piece[], start: number, end: number): void {
  if (end <= start) return;
  const last = pieces[pieces.length - 1];
  if (last && !last.bytes && last.end === start) {
    last.end = end;
    return;
  }
  pieces.push({ start, end });
}

function pieceLength(piece: Piece): number {
  return piece.bytes ? piece.bytes.length : piece.end - piece.start;
}

export function buildBlob(source: Blob, pieces: Piece[], mime: string): Blob {
  const parts: BlobPart[] = [];
  for (const piece of pieces) {
    if (piece.bytes) parts.push(piece.bytes as BlobPart);
    else parts.push(source.slice(piece.start, piece.end));
  }
  return new Blob(parts, { type: mime });
}

/*
  Reads the TIFF block used by EXIF. Every offset is bounds-checked,
  so damaged data returns fewer fields instead of throwing.
*/
function parseExif(raw: Uint8Array): ExifSummary {
  const summary: ExifSummary = { fields: [], orientation: 0, ifd0Count: 0, hasSubIfd: false };
  const data = raw.length > 6 && asciiAt(raw, 0, 4) === "Exif" ? raw.subarray(6) : raw;
  if (data.length < 8) return summary;
  const order = data[0] ?? 0;
  if (order !== 0x49 && order !== 0x4d) return summary;
  const little = order === 0x49;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const u16 = (o: number): number => (o >= 0 && o + 2 <= view.byteLength ? view.getUint16(o, little) : 0);
  const u32 = (o: number): number => (o >= 0 && o + 4 <= view.byteLength ? view.getUint32(o, little) : 0);
  if (u16(2) !== 42) return summary;

  const entries = (offset: number): IfdEntry[] => {
    const list: IfdEntry[] = [];
    if (offset < 8 || offset + 2 > view.byteLength) return list;
    const total = Math.min(u16(offset), 256);
    for (let n = 0; n < total; n += 1) {
      const e = offset + 2 + n * 12;
      if (e + 12 > view.byteLength) break;
      const type = u16(e + 2);
      const count = u32(e + 4);
      const size = (TYPE_SIZES[type] ?? 0) * count;
      list.push({ tag: u16(e), type, count, slot: e + 8, where: size <= 4 ? e + 8 : u32(e + 8) });
    }
    return list;
  };

  const addText = (defs: TagDef[], en: IfdEntry): void => {
    if (en.type !== 2) return;
    const def = defs.find((d) => d.tag === en.tag);
    if (!def) return;
    const value = readText(data, en.where, en.count);
    if (value === "") return;
    summary.fields.push({ label: def.label, value, sensitive: def.sensitive });
  };

  const rational = (where: number): number => {
    const denominator = u32(where + 4);
    return denominator === 0 ? 0 : u32(where) / denominator;
  };
  const dms = (where: number): number => rational(where) + rational(where + 8) / 60 + rational(where + 16) / 3600;

  const ifd0 = entries(u32(4));
  summary.ifd0Count = ifd0.length;
  let exifPointer = 0;
  let gpsPointer = 0;
  for (const en of ifd0) {
    if (en.tag === 0x0112) summary.orientation = u16(en.slot);
    else if (en.tag === 0x8769) exifPointer = u32(en.slot);
    else if (en.tag === 0x8825) gpsPointer = u32(en.slot);
    else addText(IFD0_TAGS, en);
  }
  summary.hasSubIfd = exifPointer > 0 ? true : gpsPointer > 0;

  for (const en of entries(exifPointer)) {
    if (en.tag === 0x927c) summary.fields.push({ label: "Maker notes", value: `${en.count} bytes of manufacturer data`, sensitive: false });
    else addText(EXIF_TAGS, en);
  }

  let latRef = "";
  let lonRef = "";
  let lat = 0;
  let lon = 0;
  let alt = 0;
  let hasLat = false;
  let hasLon = false;
  let hasAlt = false;
  for (const en of entries(gpsPointer)) {
    if (en.tag === 1 && en.type === 2) latRef = readText(data, en.where, en.count);
    else if (en.tag === 3 && en.type === 2) lonRef = readText(data, en.where, en.count);
    else if (en.tag === 2 && en.type === 5 && en.count === 3) {
      lat = dms(en.where);
      hasLat = true;
    } else if (en.tag === 4 && en.type === 5 && en.count === 3) {
      lon = dms(en.where);
      hasLon = true;
    } else if (en.tag === 6 && en.type === 5) {
      alt = rational(en.where);
      hasAlt = true;
    }
  }
  if (hasLat && hasLon) {
    const latitude = latRef.toUpperCase().startsWith("S") ? -lat : lat;
    const longitude = lonRef.toUpperCase().startsWith("W") ? -lon : lon;
    const blank = latitude === 0 ? longitude === 0 : false;
    if (!blank && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      if (Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180) {
        summary.fields.push({ label: "GPS location", value: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`, sensitive: true });
        if (hasAlt && Number.isFinite(alt)) {
          summary.fields.push({ label: "GPS altitude", value: `${alt.toFixed(0)} m`, sensitive: true });
        }
      }
    }
  }
  return summary;
}

function applyExif(report: MetaReport, summary: ExifSummary): void {
  for (const field of summary.fields) {
    if (!report.fields.some((f) => f.label === field.label)) report.fields.push(field);
  }
  if (summary.orientation > 0) report.orientation = summary.orientation;
  report.orientationOnly = summary.ifd0Count === 1 && summary.orientation > 0 && !summary.hasSubIfd;
  if (report.fields.some((f) => f.label === "GPS location")) report.hasGps = true;
}

/*
  A minimal EXIF block holding only the rotation tag. Total length is
  36 bytes: marker (2), length field (2) and 32 bytes of payload.
*/
function buildOrientationSegment(orientation: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xe1, 0x00, 0x22,
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08,
    0x00, 0x01,
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation & 0xff, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
  ]);
}

interface Tracker {
  state: number;
  hi: number;
  skip: number;
}

/*
  Walks JPEG scan data and returns the index just after the end-of-image
  marker, or -1 if it is not in this chunk. States: 0 scan data, 1 after
  an FF byte, 2 and 3 reading a segment length, 4 skipping a segment.
*/
function feedTracker(t: Tracker, bytes: Uint8Array): number {
  let i = 0;
  const n = bytes.length;
  while (i < n) {
    if (t.state === 0) {
      const j = bytes.indexOf(0xff, i);
      if (j < 0) return -1;
      i = j + 1;
      t.state = 1;
    } else if (t.state === 1) {
      const b = bytes[i] ?? 0;
      i += 1;
      if (b === 0xff) {
        t.state = 1;
      } else if (b === 0x00) {
        t.state = 0;
      } else if (b === 0x01) {
        t.state = 0;
      } else if (b >= 0xd0 && b <= 0xd7) {
        t.state = 0;
      } else if (b === 0xd9) {
        return i;
      } else {
        t.state = 2;
      }
    } else if (t.state === 2) {
      t.hi = bytes[i] ?? 0;
      i += 1;
      t.state = 3;
    } else if (t.state === 3) {
      const length = t.hi * 256 + (bytes[i] ?? 0);
      i += 1;
      t.skip = length > 2 ? length - 2 : 0;
      t.state = t.skip > 0 ? 4 : 0;
    } else {
      const step = Math.min(t.skip, n - i);
      i += step;
      t.skip -= step;
      if (t.skip === 0) t.state = 0;
    }
  }
  return -1;
}

function hasNoLength(marker: number): boolean {
  if (marker === 0xd8) return true;
  if (marker === 0x01) return true;
  return marker >= 0xd0 && marker <= 0xd7;
}

async function analyzeJpeg(file: Blob, deep: boolean, keepOrientation: boolean): Promise<Analysis> {
  const report = emptyReport("JPEG");
  const pieces: Piece[] = [{ start: 0, end: 0, bytes: new Uint8Array([0xff, 0xd8]) }];
  const size = file.size;
  let pos = 2;
  let finished = false;

  while (!finished && pos + 2 <= size) {
    const head = await readBytes(file, pos, 4);
    if (head[0] !== 0xff) throw new Error(DAMAGED_MESSAGE);
    const marker = head[1] ?? 0;
    if (marker === 0xff) {
      pos += 1;
      continue;
    }
    if (marker === 0x00) throw new Error(DAMAGED_MESSAGE);
    if (hasNoLength(marker)) {
      addRange(pieces, pos, pos + 2);
      pos += 2;
      continue;
    }
    if (marker === 0xd9) {
      addRange(pieces, pos, pos + 2);
      pos += 2;
      if (pos < size) noteRemoved(report, "trailer", "Data hidden after the image end", size - pos);
      finished = true;
      break;
    }
    if (head.length < 4) throw new Error(DAMAGED_MESSAGE);
    const length = (head[2] ?? 0) * 256 + (head[3] ?? 0);
    if (length < 2) throw new Error(DAMAGED_MESSAGE);
    const segmentEnd = pos + 2 + length;
    if (segmentEnd > size) throw new Error(DAMAGED_MESSAGE);

    if (marker === 0xda) {
      if (!deep) {
        addRange(pieces, pos, size);
        finished = true;
        break;
      }
      const tracker: Tracker = { state: 0, hi: 0, skip: 0 };
      let cursor = segmentEnd;
      let endAt = -1;
      while (cursor < size) {
        const chunk = await readBytes(file, cursor, SCAN_CHUNK);
        if (chunk.length === 0) break;
        const hit = feedTracker(tracker, chunk);
        if (hit >= 0) {
          endAt = cursor + hit;
          break;
        }
        cursor += chunk.length;
      }
      const stop = endAt >= 0 ? endAt : size;
      addRange(pieces, pos, stop);
      if (stop < size) noteRemoved(report, "trailer", "Data hidden after the image end", size - stop);
      finished = true;
      break;
    }

    const isApp = marker >= 0xe0 && marker <= 0xef;
    const isComment = marker === 0xfe;
    if (!isApp && !isComment) {
      addRange(pieces, pos, segmentEnd);
      pos = segmentEnd;
      continue;
    }
    if (marker === 0xe0 || marker === 0xee) {
      addRange(pieces, pos, segmentEnd);
      pos = segmentEnd;
      continue;
    }

    const payloadSize = length - 2;
    const need = marker === 0xe1 ? Math.min(payloadSize, MAX_APP_BYTES) : Math.min(payloadSize, 40);
    const payload = await readBytes(file, pos + 4, need);
    const total = length + 2;

    if (marker === 0xe2 && startsWithText(payload, "ICC_PROFILE\u0000")) {
      addRange(pieces, pos, segmentEnd);
    } else if (marker === 0xe1 && startsWithText(payload, "Exif\u0000\u0000")) {
      applyExif(report, parseExif(payload.subarray(6)));
      noteRemoved(report, "exif", "EXIF camera data (JPEG)", total);
    } else if (marker === 0xe1 && startsWithText(payload, "http://ns.adobe.com/xap/1.0/")) {
      noteRemoved(report, "xmp", "XMP editing data", total);
    } else if (marker === 0xe1 && startsWithText(payload, "http://ns.adobe.com/xmp/extension/")) {
      noteRemoved(report, "xmp", "XMP editing data", total);
    } else if (marker === 0xe1) {
      noteRemoved(report, "other", "Other embedded data (APP1)", total);
    } else if (marker === 0xed) {
      noteRemoved(report, "iptc", "Photoshop and IPTC captions", total);
    } else if (isComment) {
      noteRemoved(report, "comment", "Embedded comment", total);
    } else {
      noteRemoved(report, "other", `Application data (APP${marker - 0xe0})`, total);
    }
    pos = segmentEnd;
  }

  if (!finished) throw new Error(DAMAGED_MESSAGE);
  if (keepOrientation && report.orientation >= 2 && report.orientation <= 8) {
    pieces.splice(1, 0, { start: 0, end: 0, bytes: buildOrientationSegment(report.orientation) });
  }
  return { report, pieces, mime: "image/jpeg" };
}

async function notePngRemoval(file: Blob, report: MetaReport, type: string, pos: number, length: number): Promise<void> {
  const total = length + 12;
  if (type === "eXIf") {
    const data = await readBytes(file, pos + 8, Math.min(length, MAX_META_READ));
    applyExif(report, parseExif(data));
    noteRemoved(report, "exif", "EXIF camera data (PNG)", total);
    return;
  }
  if (PNG_TEXT.includes(type)) {
    const data = await readBytes(file, pos + 8, Math.min(length, 96));
    const keyword = readText(data, 0, 80);
    if (keyword === "XML:com.adobe.xmp") {
      noteRemoved(report, "xmp", "XMP editing data", total);
      return;
    }
    noteRemoved(report, "text", keyword === "" ? `Text note (${type})` : `Text note: ${keyword}`, total);
    return;
  }
  if (type === "tIME") {
    noteRemoved(report, "other", "Last-modified timestamp", total);
    return;
  }
  noteRemoved(report, "other", `Extra data chunk (${type})`, total);
}

async function analyzePng(file: Blob): Promise<Analysis> {
  const report = emptyReport("PNG");
  const pieces: Piece[] = [];
  const size = file.size;
  addRange(pieces, 0, 8);
  let pos = 8;
  let sawEnd = false;

  while (pos < size) {
    if (pos + 12 > size) throw new Error(DAMAGED_MESSAGE);
    const head = await readBytes(file, pos, 8);
    const length = readU32Be(head, 0);
    const type = asciiAt(head, 4, 4);
    const end = pos + 12 + length;
    if (end > size) throw new Error(DAMAGED_MESSAGE);
    const critical = ((type.charCodeAt(0) & 0x20) === 0);
    if (critical) addRange(pieces, pos, end);
    else if (PNG_KEEP.includes(type)) addRange(pieces, pos, end);
    else await notePngRemoval(file, report, type, pos, length);
    pos = end;
    if (type === "IEND") {
      sawEnd = true;
      break;
    }
  }
  if (!sawEnd) throw new Error(DAMAGED_MESSAGE);
  if (pos < size) noteRemoved(report, "trailer", "Data hidden after the image end", size - pos);
  return { report, pieces, mime: "image/png" };
}

async function analyzeWebp(file: Blob): Promise<Analysis> {
  const report = emptyReport("WebP");
  const body: Piece[] = [];
  const size = file.size;
  const riffHead = await readBytes(file, 0, 12);
  const limit = Math.min(size, 8 + readU32Le(riffHead, 4));
  let pos = 12;

  while (pos + 8 <= limit) {
    const head = await readBytes(file, pos, 8);
    const type = asciiAt(head, 0, 4);
    const length = readU32Le(head, 4);
    const payloadEnd = pos + 8 + length;
    if (payloadEnd > limit) throw new Error(DAMAGED_MESSAGE);
    const end = Math.min(payloadEnd + (length % 2), limit);
    if (WEBP_KEEP.includes(type)) {
      if (type === "VP8X" && length >= 10) {
        const first = await readBytes(file, pos, 18);
        const patched = new Uint8Array(first);
        patched[8] = (patched[8] ?? 0) & 0xf3;
        body.push({ start: 0, end: 0, bytes: patched });
        addRange(body, pos + 18, end);
      } else {
        addRange(body, pos, end);
      }
    } else if (type === "EXIF") {
      const data = await readBytes(file, pos + 8, Math.min(length, MAX_META_READ));
      applyExif(report, parseExif(data));
      noteRemoved(report, "exif", "EXIF camera data (WebP)", length + 8);
    } else if (type === "XMP ") {
      noteRemoved(report, "xmp", "XMP editing data", length + 8);
    } else {
      noteRemoved(report, "other", `Extra data chunk (${type.trim()})`, length + 8);
    }
    pos = end;
  }
  if (pos < size) noteRemoved(report, "trailer", "Data hidden after the image end", size - pos);

  let total = 0;
  for (const piece of body) total += pieceLength(piece);
  if (total % 2 === 1) {
    body.push({ start: 0, end: 0, bytes: new Uint8Array(1) });
    total += 1;
  }
  const header = new Uint8Array(12);
  header.set([0x52, 0x49, 0x46, 0x46], 0);
  new DataView(header.buffer).setUint32(4, total + 4, true);
  header.set([0x57, 0x45, 0x42, 0x50], 8);
  const pieces: Piece[] = [{ start: 0, end: 0, bytes: header }].concat(body);
  return { report, pieces, mime: "image/webp" };
}

function detectFormat(head: Uint8Array): string {
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return "jpeg";
  const pngMarks = head[0] === 0x89 && head[4] === 0x0d && head[5] === 0x0a && head[6] === 0x1a && head[7] === 0x0a;
  if (pngMarks && asciiAt(head, 1, 3) === "PNG") return "png";
  if (asciiAt(head, 0, 4) === "RIFF" && asciiAt(head, 8, 4) === "WEBP") return "webp";
  return "";
}

async function analyze(file: Blob, deep: boolean, keepOrientation: boolean): Promise<Analysis> {
  const head = await readBytes(file, 0, 16);
  const format = detectFormat(head);
  if (format === "jpeg") return analyzeJpeg(file, deep, keepOrientation);
  if (format === "png") return analyzePng(file);
  if (format === "webp") return analyzeWebp(file);
  throw new Error(UNSUPPORTED_MESSAGE);
}

function countLeftover(report: MetaReport): number {
  let n = 0;
  for (const item of report.removed) {
    if (item.kind === "exif" && report.orientationOnly) continue;
    n += item.count;
  }
  if (report.hasGps) n += 1;
  return n;
}

function failed(id: number, message: string): MetaReply {
  return { ok: false, id, message, report: emptyReport(""), leftover: 0, outputSize: 0 };
}

/*
  Shared by the worker and by the main-thread fallback. "inspect" only
  lists what the file contains. "clean" builds the cleaned file from
  slices of the original, then scans that result again to verify it.
*/
export async function processRequest(request: MetaRequest): Promise<MetaReply> {
  try {
    const cleaning = request.type === "clean";
    const analysis = await analyze(request.file, cleaning, request.keepOrientation);
    if (!cleaning) {
      return { ok: true, id: request.id, message: "", report: analysis.report, leftover: 0, outputSize: 0 };
    }
    const blob = buildBlob(request.file, analysis.pieces, analysis.mime);
    const check = await analyze(blob, true, false);
    return {
      ok: true,
      id: request.id,
      message: "",
      report: analysis.report,
      leftover: countLeftover(check.report),
      outputSize: blob.size,
      blob,
    };
  } catch (error) {
    return failed(request.id, describeError(error));
  }
}
