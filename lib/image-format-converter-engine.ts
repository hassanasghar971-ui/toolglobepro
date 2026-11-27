export interface OutputFormat {
  id: string;
  label: string;
  mime: string;
  ext: string;
  lossy: boolean;
  alpha: boolean;
  hint: string;
}

const PNG_FORMAT: OutputFormat = {
  id: "png",
  label: "PNG",
  mime: "image/png",
  ext: "png",
  lossy: false,
  alpha: true,
  hint: "Lossless. Best for screenshots, logos and transparent images.",
};

const JPG_FORMAT: OutputFormat = {
  id: "jpg",
  label: "JPG",
  mime: "image/jpeg",
  ext: "jpg",
  lossy: true,
  alpha: false,
  hint: "Small photos that work everywhere. No transparency.",
};

const WEBP_FORMAT: OutputFormat = {
  id: "webp",
  label: "WebP",
  mime: "image/webp",
  ext: "webp",
  lossy: true,
  alpha: true,
  hint: "Smallest files for websites. Supports transparency.",
};

export const OUTPUT_FORMATS: OutputFormat[] = [PNG_FORMAT, JPG_FORMAT, WEBP_FORMAT];
export const DEFAULT_FORMAT: OutputFormat = JPG_FORMAT;

export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_BATCH_BYTES = 600 * 1024 * 1024;
export const MAX_EDGE = 16384;
export const MAX_PIXELS = 100000000;

export const DECODE_MESSAGE =
  "This file could not be decoded. It may be damaged, or your browser may not support its format.";
export const SIZE_MESSAGE =
  "This image is too large for your device to convert. Set a smaller maximum size and try again.";

export interface ConvertOptions {
  format: string;
  quality: number;
  maxEdge: number;
  background: string;
}

export interface ConvertRequest {
  type: string;
  id: number;
  file: File;
  options: ConvertOptions;
}

export interface ConvertReply {
  ok: boolean;
  id: number;
  message: string;
  width: number;
  height: number;
  sourceWidth: number;
  sourceHeight: number;
  crc: number;
  blob?: Blob;
}

export interface Layout {
  width: number;
  height: number;
  scaled: boolean;
}

export interface DrawContext
  extends CanvasFillStrokeStyles,
    CanvasRect,
    CanvasDrawImage,
    CanvasImageSmoothing {}

const IMAGE_EXTENSIONS: string[] = [
  "png",
  "jpg",
  "jpeg",
  "jpe",
  "jfif",
  "webp",
  "gif",
  "bmp",
  "avif",
  "svg",
  "ico",
  "heic",
  "heif",
];

export function encodeFailureMessage(label: string): string {
  return `This browser cannot save ${label} files. Choose PNG or JPG instead, or try a current version of Chrome, Edge or Firefox.`;
}

export function describeError(error: unknown): string {
  return error instanceof Error && error.message !== "" ? error.message : "The conversion failed. Please try again.";
}

export function getFormat(id: string): OutputFormat {
  return OUTPUT_FORMATS.find((f) => f.id === id) ?? DEFAULT_FORMAT;
}

export function clampQuality(value: number): number {
  if (!Number.isFinite(value)) return 0.85;
  return Math.min(1, Math.max(0.1, value));
}

export function parseMaxEdge(text: string): number {
  const digits = text.replace(/[^0-9]/g, "");
  const value = Number.parseInt(digits, 10);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value, MAX_EDGE);
}

export function normalizeHex(value: string): string {
  const text = value.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(text)) return text.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(text)) {
    return "#" + text.slice(1).split("").map((c) => c + c).join("").toLowerCase();
  }
  return "#ffffff";
}

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot + 1).toLowerCase();
}

export function isLikelyImage(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return IMAGE_EXTENSIONS.includes(extensionOf(file.name));
}

export function needsMainThread(file: File): boolean {
  if (file.type === "image/svg+xml") return true;
  return extensionOf(file.name) === "svg";
}

export function computeLayout(
  sourceWidth: number,
  sourceHeight: number,
  maxEdge: number,
  allowUpscale: boolean,
): Layout {
  const longest = Math.max(sourceWidth, sourceHeight);
  const keep: Layout = {
    width: Math.max(1, Math.round(sourceWidth)),
    height: Math.max(1, Math.round(sourceHeight)),
    scaled: false,
  };
  if (maxEdge <= 0 || longest <= 0) return keep;
  if (longest <= maxEdge && !allowUpscale) return keep;
  if (longest === maxEdge) return keep;
  const ratio = maxEdge / longest;
  return {
    width: Math.max(1, Math.round(sourceWidth * ratio)),
    height: Math.max(1, Math.round(sourceHeight * ratio)),
    scaled: true,
  };
}

export function exceedsPixelLimit(width: number, height: number): boolean {
  return width * height > MAX_PIXELS;
}

/*
  An empty fill string keeps transparency. Any other value paints a
  solid background first, which JPG needs because it has no alpha.
*/
export function paintToContext(
  context: DrawContext,
  source: CanvasImageSource,
  layout: Layout,
  fill: string,
): void {
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  if (fill !== "") {
    context.fillStyle = fill;
    context.fillRect(0, 0, layout.width, layout.height);
  }
  context.drawImage(source, 0, 0, layout.width, layout.height);
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

export function savedPercent(sourceBytes: number, outputBytes: number): number {
  if (sourceBytes <= 0) return 0;
  return Math.round((1 - outputBytes / sourceBytes) * 100);
}

export function outputFileName(original: string, ext: string, used: Set<string>): string {
  const dot = original.lastIndexOf(".");
  const stem = (dot > 0 ? original.slice(0, dot) : original).replace(/[\\/:*?"<>]/g, "-").trim();
  const base = stem === "" ? "image" : stem;
  let name = `${base}.${ext}`;
  let counter = 1;
  while (used.has(name.toLowerCase())) {
    name = `${base}-${counter}.${ext}`;
    counter += 1;
  }
  used.add(name.toLowerCase());
  return name;
}

let crcTable = new Uint32Array(0);

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) !== 0 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
}

export function crc32(bytes: Uint8Array): number {
  if (crcTable.length === 0) crcTable = buildCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    const index = (crc ^ (bytes[i] ?? 0)) & 0xff;
    crc = (crcTable[index] ?? 0) ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export async function crcOfBlob(blob: Blob): Promise<number> {
  const buffer = await blob.arrayBuffer();
  return crc32(new Uint8Array(buffer));
}

export interface ZipEntry {
  name: string;
  blob: Blob;
  crc: number;
}

function dosStamp(when: Date): { time: number; date: number } {
  const year = Math.max(1980, when.getFullYear());
  return {
    time: (when.getHours() << 11) + (when.getMinutes() << 5) + Math.floor(when.getSeconds() / 2),
    date: ((year - 1980) << 9) + ((when.getMonth() + 1) << 5) + when.getDate(),
  };
}

/*
  Builds a store-only ZIP (no compression, which suits already
  compressed images). File data stays as Blob parts, so nothing large
  is copied into memory.
*/
export function buildZip(entries: ZipEntry[]): Blob {
  const encoder = new TextEncoder();
  const stamp = dosStamp(new Date());
  const parts: BlobPart[] = [];
  const central: BlobPart[] = [];
  let offset = 0;
  let centralSize = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const size = entry.blob.size;

    const local = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 2048, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, stamp.time, true);
    lv.setUint16(12, stamp.date, true);
    lv.setUint32(14, entry.crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    parts.push(local, entry.blob);

    const header = new Uint8Array(46 + nameBytes.length);
    const hv = new DataView(header.buffer);
    hv.setUint32(0, 0x02014b50, true);
    hv.setUint16(4, 20, true);
    hv.setUint16(6, 20, true);
    hv.setUint16(8, 2048, true);
    hv.setUint16(10, 0, true);
    hv.setUint16(12, stamp.time, true);
    hv.setUint16(14, stamp.date, true);
    hv.setUint32(16, entry.crc, true);
    hv.setUint32(20, size, true);
    hv.setUint32(24, size, true);
    hv.setUint16(28, nameBytes.length, true);
    hv.setUint16(30, 0, true);
    hv.setUint16(32, 0, true);
    hv.setUint16(34, 0, true);
    hv.setUint16(36, 0, true);
    hv.setUint32(38, 0, true);
    hv.setUint32(42, offset, true);
    header.set(nameBytes, 46);
    central.push(header);

    centralSize += header.length;
    offset += local.length + size;
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

  return new Blob([...parts, ...central, end], { type: "application/zip" });
}
