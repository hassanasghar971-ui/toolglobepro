import {
  DECODE_MESSAGE,
  SIZE_MESSAGE,
  clampQuality,
  computeLayout,
  crcOfBlob,
  describeError,
  encodeFailureMessage,
  exceedsPixelLimit,
  getFormat,
  normalizeHex,
  paintToContext,
} from "@/lib/image-format-converter-engine";
import type { ConvertReply, ConvertRequest } from "@/lib/image-format-converter-engine";

interface Poster {
  postMessage(message: unknown): void;
}

const poster = self as unknown as Poster;

function reply(message: ConvertReply): void {
  poster.postMessage(message);
}

async function decode(file: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new Error(DECODE_MESSAGE);
  }
}

async function convert(request: ConvertRequest): Promise<void> {
  const { id, file, options } = request;
  try {
    const format = getFormat(options.format);
    const bitmap = await decode(file);
    try {
      const layout = computeLayout(bitmap.width, bitmap.height, options.maxEdge, false);
      if (exceedsPixelLimit(layout.width, layout.height)) throw new Error(SIZE_MESSAGE);
      const canvas = new OffscreenCanvas(layout.width, layout.height);
      const context = canvas.getContext("2d");
      if (!context) throw new Error(SIZE_MESSAGE);
      const fill = format.alpha ? "" : normalizeHex(options.background);
      paintToContext(context, bitmap, layout, fill);
      const blob = await canvas.convertToBlob({
        type: format.mime,
        quality: clampQuality(options.quality),
      });
      if (blob.type !== format.mime) throw new Error(encodeFailureMessage(format.label));
      const crc = await crcOfBlob(blob);
      reply({
        ok: true,
        id,
        message: "",
        width: layout.width,
        height: layout.height,
        sourceWidth: bitmap.width,
        sourceHeight: bitmap.height,
        crc,
        blob,
      });
    } finally {
      bitmap.close();
    }
  } catch (error) {
    reply({
      ok: false,
      id,
      message: describeError(error),
      width: 0,
      height: 0,
      sourceWidth: 0,
      sourceHeight: 0,
      crc: 0,
    });
  }
}

self.addEventListener("message", (event: MessageEvent<ConvertRequest>) => {
  const data = event.data;
  if (data && data.type === "convert") {
    void convert(data);
  }
});
