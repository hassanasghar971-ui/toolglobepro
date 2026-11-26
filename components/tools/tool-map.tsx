import dynamic from "next/dynamic";
import type { ComponentType } from "react";

const WordCounterTool = dynamic(() => import("./WordCounterTool"));
const IpLookupTool = dynamic(() => import("./IpLookupTool"));
const PasswordGeneratorTool = dynamic(() => import("./PasswordGeneratorTool"));
const Base64ConverterTool = dynamic(() => import("./Base64ConverterTool"));
const JsonFormatterTool = dynamic(() => import("./JsonFormatterTool"));
const SlugGeneratorTool = dynamic(() => import("./SlugGeneratorTool"));
const QrCodeGeneratorTool = dynamic(() => import("./QrCodeGeneratorTool"));
const HashGeneratorTool = dynamic(() => import("./HashGeneratorTool"));
const CaseConverterTool = dynamic(() => import("./CaseConverterTool"));
const ImageCompressorTool = dynamic(() => import("./ImageCompressorTool"));
const TextDiffCheckerTool = dynamic(() => import("./TextDiffCheckerTool"));
const LoremIpsumGeneratorTool = dynamic(() => import("./LoremIpsumGeneratorTool"));
const ColorConverterTool = dynamic(() => import("./ColorConverterTool"));
const UnitConverterTool = dynamic(() => import("./UnitConverterTool"));
const TimestampConverterTool = dynamic(() => import("./TimestampConverterTool"));
const MarkdownPreviewerTool = dynamic(() => import("./MarkdownPreviewerTool"));
const CsvToJsonTool = dynamic(() => import("./CsvToJsonTool"));
const UrlEncoderDecoderTool = dynamic(() => import("./UrlEncoderDecoderTool"));

export const TOOL_MAP: Record<string, ComponentType> = {
  "word-counter": WordCounterTool,
  "ip-lookup": IpLookupTool,
  "password-generator": PasswordGeneratorTool,
  "base64-converter": Base64ConverterTool,
  "json-formatter": JsonFormatterTool,
  "slug-generator": SlugGeneratorTool,
  "qr-code-generator": QrCodeGeneratorTool,
  "hash-generator": HashGeneratorTool,
  "case-converter": CaseConverterTool,
  "image-compressor": ImageCompressorTool,
  "text-diff-checker": TextDiffCheckerTool,
  "lorem-ipsum-generator": LoremIpsumGeneratorTool,
  "color-converter": ColorConverterTool,
  "unit-converter": UnitConverterTool,
  "timestamp-converter": TimestampConverterTool,
  "markdown-previewer": MarkdownPreviewerTool,
  "csv-to-json": CsvToJsonTool,
  "url-encoder-decoder": UrlEncoderDecoderTool,
};

export const TOOL_COMPONENTS = TOOL_MAP;

export const toolComponents = TOOL_MAP;

export function getToolComponent(slug: string): ComponentType | undefined {
  return TOOL_MAP[slug];
}

export default TOOL_MAP;
