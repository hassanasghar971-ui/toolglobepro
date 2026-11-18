export type OutputFormat = "auto" | "image/jpeg" | "image/webp" | "image/png";
export type Stage = "decoding" | "drawing" | "encoding" | "finalizing";

export const MAX_FILE_BYTES = 600 * 1024 * 1024;
export const MAX_FILES = 200;
export const MAX_PIXELS = 120_000_000;
export const ACCEPTED_MIME: ReadonlySet<string> = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/avif",
]);

export interface CompressOptions {
  format: OutputFormat;
  quality: number;
  maxDimension: number;
  background: string;
}

export interface CompressResult {
  blob: Blob;
  mime: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  keptOriginal: boolean;
  fellBack: boolean;
}

export interface ImageWorkerRequest {
  id: number;
  file: File;
  options: CompressOptions;
}

export type ImageWorkerResponse =
  | { id: number; type: "stage"; stage: Stage }
  | { id: number; type: "done"; result: CompressResult }
  | { id: number; type: "error"; message: string; unsupported?: boolean };

interface Ctx2D {
  fillStyle: string;
  imageSmoothingEnabled: boolean;
  imageSmoothingQuality: "low" | "medium" | "high";
  fillRect(x: number, y: number, w: number, h: number): void;
  drawImage(image: ImageBitmap, dx: number, dy: number, dw: number, dh: number): void;
}

interface Surface {
  ctx: Ctx2D;
  toBlob(mime: string, quality: number): Promise<Blob>;
  dispose(): void;
}

const MEMORY_MESSAGE =
  "The browser could not allocate a canvas for this image. It is probably too large for this device's memory — try a smaller maximum dimension.";

const tick = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

export function extensionFor(mime: string): string {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/webp") return "webp";
  if (mime === "image/png") return "png";
  return "img";
}

export function outputName(originalName: string, mime: string): string {
  const dot = originalName.lastIndexOf(".");
  const stem = dot > 0 ? originalName.slice(0, dot) : originalName;
  return `${stem || "image"}-compressed.${extensionFor(mime)}`;
}

export function resolveFormat(inputMime: string, format: OutputFormat): string {
  if (format !== "auto") return format;
  if (inputMime === "image/jpeg" || inputMime === "image/webp" || inputMime === "image/png") {
    return inputMime;
  }
  return "image/webp";
}

export function fitWithin(
  width: number,
  height: number,
  maxDimension: number,
): { width: number; height: number } {
  if (!(maxDimension > 0) || Math.max(width, height) <= maxDimension) {
    return { width, height };
  }
  const scale = maxDimension / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function safeColor(color: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#ffffff";
}

function createSurface(width: number, height: number): Surface {
  if (typeof OffscreenCanvas !== "undefined") {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error(MEMORY_MESSAGE);
    return {
      ctx: ctx as unknown as Ctx2D,
      toBlob: (mime, quality) => canvas.convertToBlob({ type: mime, quality }),
      dispose: () => {
        canvas.width = 1;
        canvas.height = 1;
      },
    };
  }
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error(MEMORY_MESSAGE);
    return {
      ctx: ctx as unknown as Ctx2D,
      toBlob: (mime, quality) =>
        new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error(MEMORY_MESSAGE))),
            mime,
            quality,
          );
        }),
      dispose: () => {
        canvas.width = 1;
        canvas.height = 1;
      },
    };
  }
  throw new Error("This browser does not support canvas image processing.");
}

async function render(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  mime: string,
  quality: number,
  background: string,
  onStage?: (stage: Stage) => void,
): Promise<Blob> {
  onStage?.("drawing");
  await tick();
  const surface = createSurface(width, height);
  try {
    const ctx = surface.ctx;
    if (mime === "image/jpeg") {
      ctx.fillStyle = safeColor(background);
      ctx.fillRect(0, 0, width, height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    onStage?.("encoding");
    await tick();
    return await surface.toBlob(mime, mime === "image/png" ? 1 : quality);
  } finally {
    surface.dispose();
  }
}

export async function compressImage(
  file: Blob,
  options: CompressOptions,
  onStage?: (stage: Stage) => void,
): Promise<CompressResult> {
  if (file.size === 0) throw new Error("This file is empty.");
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(`This file is larger than ${Math.round(MAX_FILE_BYTES / 1048576)} MB.`);
  }

  onStage?.("decoding");
  await tick();
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error(
      "Your browser could not decode this image. It may be corrupted, or in a format this browser does not support (for example HEIC).",
    );
  }

  try {
    const originalWidth = bitmap.width;
    const originalHeight = bitmap.height;
    if (originalWidth * originalHeight > MAX_PIXELS) {
      const mp = Math.round((originalWidth * originalHeight) / 1_000_000);
      throw new Error(
        `This image is ${mp} megapixels. Browsers cannot safely process more than ${MAX_PIXELS / 1_000_000} MP.`,
      );
    }

    const { width, height } = fitWithin(originalWidth, originalHeight, options.maxDimension);
    const quality = Math.min(1, Math.max(0.1, options.quality));
    let mime = resolveFormat(file.type, options.format);
    let fellBack = false;

    let blob = await render(bitmap, width, height, mime, quality, options.background, onStage);
    if (blob.type !== mime) {
      if (mime === "image/webp") {
        mime = "image/jpeg";
        fellBack = true;
        blob = await render(bitmap, width, height, mime, quality, options.background, onStage);
      }
      if (blob.type !== mime) {
        throw new Error("This browser cannot encode the selected output format. Try JPEG or PNG.");
      }
    }

    onStage?.("finalizing");
    const resized = width !== originalWidth || height !== originalHeight;
    if (!resized && mime === file.type && blob.size >= file.size) {
      return {
        blob: file,
        mime: file.type,
        width: originalWidth,
        height: originalHeight,
        originalWidth,
        originalHeight,
        keptOriginal: true,
        fellBack,
      };
    }

    return {
      blob,
      mime,
      width,
      height,
      originalWidth,
      originalHeight,
      keptOriginal: false,
      fellBack,
    };
  } finally {
    bitmap.close();
  }
}
