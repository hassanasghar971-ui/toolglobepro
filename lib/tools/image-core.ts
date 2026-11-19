/**
 * image-core.ts
 * Shared image-compression logic. Used by the Web Worker and as the
 * main-thread fallback. Nothing here uploads data: all work stays in the browser.
 */

export const MAX_FILE_BYTES = 600 * 1024 * 1024;
export const MAX_FILES = 200;
export const MAX_PIXELS = 120_000_000;
export const DEFAULT_QUALITY = 80;
export const MIN_QUALITY = 10;
export const MAX_QUALITY = 100;

export type OutputFormat = "original" | "jpeg" | "webp" | "png";
export type ImageStage = "decoding" | "resizing" | "encoding";

export interface CompressSettings {
  quality: number;
  /** Longest side in pixels. 0 keeps the original size. */
  maxDimension: number;
  format: OutputFormat;
  /** Hex colour used behind transparent areas when saving as JPEG. */
  background: string;
}

export interface CompressResult {
  blob: Blob;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  outType: string;
  keptOriginal: boolean;
  usedFallback: boolean;
}

export interface ImageWorkerRequest {
  id: number;
  file: Blob;
  inputType: string;
  settings: CompressSettings;
}

export type ImageWorkerResponse =
  | { kind: "stage"; id: number; stage: ImageStage }
  | { kind: "result"; id: number; result: CompressResult }
  | { kind: "error"; id: number; message: string; code: "unsupported" | "failed" };

export const DIMENSION_PRESETS: { value: number; label: string }[] = [
  { value: 0, label: "Original size" },
  { value: 3840, label: "3840 px (4K)" },
  { value: 2560, label: "2560 px (QHD)" },
  { value: 1920, label: "1920 px (Full HD)" },
  { value: 1280, label: "1280 px (HD)" },
  { value: 1080, label: "1080 px (Instagram)" },
  { value: 800, label: "800 px (Web)" },
  { value: 512, label: "512 px (Thumbnail)" },
];

export const SUPPORTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/avif",
]);

const EXTENSION_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  jpe: "image/jpeg",
  jfif: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  avif: "image/avif",
};

export class CanvasUnavailableError extends Error {
  readonly code = "unsupported" as const;
  constructor(message = "Canvas is not available in this context.") {
    super(message);
    this.name = "CanvasUnavailableError";
  }
}

/** Works out the real image type from MIME type or file extension. */
export function detectImageType(name: string, mime: string): string | null {
  const m = mime.toLowerCase();
  if (m === "image/jpg" || m === "image/pjpeg") return "image/jpeg";
  if (m === "image/x-ms-bmp" || m === "image/x-bmp") return "image/bmp";
  if (SUPPORTED_TYPES.has(m)) return m;
  const dot = name.lastIndexOf(".");
  if (dot < 0) return null;
  return EXTENSION_TYPES[name.slice(dot + 1).toLowerCase()] ?? null;
}

export function normalizeSettings(s: CompressSettings): CompressSettings {
  const quality = Number.isFinite(s.quality)
    ? Math.min(MAX_QUALITY, Math.max(MIN_QUALITY, Math.round(s.quality)))
    : DEFAULT_QUALITY;
  const maxDimension =
    Number.isFinite(s.maxDimension) && s.maxDimension > 0
      ? Math.round(s.maxDimension)
      : 0;
  const background = /^#[0-9a-f]{6}$/i.test(s.background)
    ? s.background.toLowerCase()
    : "#ffffff";
  const format: OutputFormat =
    s.format === "jpeg" || s.format === "webp" || s.format === "png"
      ? s.format
      : "original";
  return { quality, maxDimension, format, background };
}

export function settingsKey(s: CompressSettings): string {
  const n = normalizeSettings(s);
  return `${n.format}|${n.quality}|${n.maxDimension}|${n.background}`;
}

export function resolveOutputType(inputType: string, format: OutputFormat): string {
  if (format === "jpeg") return "image/jpeg";
  if (format === "webp") return "image/webp";
  if (format === "png") return "image/png";
  switch (inputType) {
    case "image/jpeg":
      return "image/jpeg";
    case "image/png":
      return "image/png";
    case "image/webp":
      return "image/webp";
    case "image/gif":
    case "image/bmp":
      return "image/png";
    case "image/avif":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

export function mimeExtension(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/bmp":
      return "bmp";
    case "image/avif":
      return "avif";
    default:
      return "img";
  }
}

export function outputName(name: string, outType: string, keptOriginal: boolean): string {
  if (keptOriginal) return name;
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).trim() || "image";
  return `${base}-compressed.${mimeExtension(outType)}`;
}

export function fitDimensions(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number; resized: boolean } {
  const longest = Math.max(width, height);
  if (maxDimension <= 0 || longest <= maxDimension) {
    return { width, height, resized: false };
  }
  const scale = maxDimension / longest;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
    resized: true,
  };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value >= 100 ? value.toFixed(0) : value.toFixed(value >= 10 ? 1 : 2)} ${units[unit]}`;
}

/** Signed percentage change. Negative means the file got smaller. */
export function percentChange(original: number, next: number): number {
  if (original <= 0) return 0;
  return Math.round(((next - original) / original) * 100);
}

/**
 * Reads the pixel size from the file header without decoding the image.
 * Returns null when the header can't be parsed. This is only a guard.
 */
export async function readImageSize(
  blob: Blob,
  type: string,
): Promise<{ width: number; height: number } | null> {
  const head = new Uint8Array(await blob.slice(0, 1024 * 1024).arrayBuffer());
  const len = head.length;
  const view = new DataView(head.buffer, head.byteOffset, head.byteLength);

  if (type === "image/png") {
    if (len < 24) return null;
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  if (type === "image/gif") {
    if (len < 10) return null;
    return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
  }

  if (type === "image/bmp") {
    if (len < 26) return null;
    return {
      width: Math.abs(view.getInt32(18, true)),
      height: Math.abs(view.getInt32(22, true)),
    };
  }

  if (type === "image/webp") {
    if (len < 30) return null;
    const tag = String.fromCharCode(head[12], head[13], head[14], head[15]);
    if (tag === "VP8 ") {
      return {
        width: view.getUint16(26, true) & 0x3fff,
        height: view.getUint16(28, true) & 0x3fff,
      };
    }
    if (tag === "VP8L") {
      const bits = view.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    if (tag === "VP8X") {
      return {
        width: 1 + (head[24] | (head[25] << 8) | (head[26] << 16)),
        height: 1 + (head[27] | (head[28] << 8) | (head[29] << 16)),
      };
    }
    return null;
  }

  if (type === "image/jpeg") {
    if (len < 4 || head[0] !== 0xff || head[1] !== 0xd8) return null;
    let i = 2;
    while (i + 9 < len) {
      if (head[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = head[i + 1];
      if (marker === 0xff) {
        i++;
        continue;
      }
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const isFrame =
        marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isFrame) {
        return {
          height: (head[i + 5] << 8) | head[i + 6],
          width: (head[i + 7] << 8) | head[i + 8],
        };
      }
      const segmentLength = (head[i + 2] << 8) | head[i + 3];
      if (segmentLength < 2) return null;
      i += 2 + segmentLength;
    }
    return null;
  }

  return null;
}

interface Surface {
  ctx: CanvasRenderingContext2D;
  toBlob(type: string, quality?: number): Promise<Blob | null>;
}

function createSurface(width: number, height: number): Surface {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D | null;
    if (!ctx) {
      throw new CanvasUnavailableError(
        "The browser could not create a canvas of this size. Try a smaller maximum dimension.",
      );
    }
    return {
      ctx,
      toBlob: (type, quality) =>
        canvas.convertToBlob({ type, quality }).catch(() => null),
    };
  }
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new CanvasUnavailableError(
        "The browser could not create a canvas of this size. Try a smaller maximum dimension.",
      );
    }
    return {
      ctx,
      toBlob: (type, quality) =>
        new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), type, quality)),
    };
  }
  throw new CanvasUnavailableError();
}

function tooManyPixels(width: number, height: number): Error {
  const mp = Math.round((width * height) / 1_000_000);
  return new Error(
    `This image is about ${mp} megapixels. Images above ${MAX_PIXELS / 1_000_000} megapixels are refused so your browser does not run out of memory.`,
  );
}

/**
 * Decodes, optionally resizes, and re-encodes one image.
 * Keeps the original file when re-encoding would not make it smaller.
 */
export async function compressImage(
  blob: Blob,
  inputType: string,
  rawSettings: CompressSettings,
  onStage?: (stage: ImageStage) => void,
): Promise<CompressResult> {
  const settings = normalizeSettings(rawSettings);
  onStage?.("decoding");

  let header: { width: number; height: number } | null = null;
  try {
    header = await readImageSize(blob, inputType);
  } catch {
    header = null;
  }
  if (header && header.width * header.height > MAX_PIXELS) {
    throw tooManyPixels(header.width, header.height);
  }

  const source = blob.type ? blob : blob.slice(0, blob.size, inputType);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    throw new Error(
      "This image could not be decoded. It may be corrupted, in an unsupported format, or too large for this device's memory.",
    );
  }

  try {
    const originalWidth = bitmap.width;
    const originalHeight = bitmap.height;
    if (originalWidth * originalHeight > MAX_PIXELS) {
      throw tooManyPixels(originalWidth, originalHeight);
    }

    const fit = fitDimensions(originalWidth, originalHeight, settings.maxDimension);
    const wantType = resolveOutputType(inputType, settings.format);
    const quality = settings.quality / 100;

    onStage?.("resizing");
    const draw = (fillBackground: boolean): Surface => {
      const surface = createSurface(fit.width, fit.height);
      if (fillBackground) {
        surface.ctx.fillStyle = settings.background;
        surface.ctx.fillRect(0, 0, fit.width, fit.height);
      }
      surface.ctx.imageSmoothingEnabled = true;
      surface.ctx.imageSmoothingQuality = "high";
      surface.ctx.drawImage(bitmap, 0, 0, fit.width, fit.height);
      return surface;
    };

    onStage?.("encoding");
    let outType = wantType;
    let usedFallback = false;
    let surface = draw(wantType === "image/jpeg");
    let out = await surface.toBlob(wantType, wantType === "image/png" ? undefined : quality);

    if ((!out || out.type !== wantType) && wantType === "image/webp") {
      // This browser cannot encode WebP. Fall back to JPEG.
      outType = "image/jpeg";
      usedFallback = true;
      surface = draw(true);
      out = await surface.toBlob("image/jpeg", quality);
    }

    if (!out || out.type !== outType) {
      throw new Error(
        "The browser could not encode this image. Try a smaller maximum dimension or a different output format.",
      );
    }

    const sameType = outType === inputType;
    if (
      !fit.resized &&
      out.size >= blob.size &&
      (settings.format === "original" || sameType)
    ) {
      return {
        blob,
        width: originalWidth,
        height: originalHeight,
        originalWidth,
        originalHeight,
        outType: inputType,
        keptOriginal: true,
        usedFallback: false,
      };
    }

    return {
      blob: out,
      width: fit.width,
      height: fit.height,
      originalWidth,
      originalHeight,
      outType,
      keptOriginal: false,
      usedFallback,
    };
  } finally {
    bitmap.close();
  }
}
