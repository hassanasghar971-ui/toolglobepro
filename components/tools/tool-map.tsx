import type { ComponentType } from "react";

import WordCounterTool from "./WordCounterTool";
import IpLookupTool from "./IpLookupTool";
import PasswordGeneratorTool from "./PasswordGeneratorTool";
import Base64ConverterTool from "./Base64ConverterTool";
import JsonFormatterTool from "./JsonFormatterTool";
import SlugGeneratorTool from "./SlugGeneratorTool";
import QrCodeGeneratorTool from "./QrCodeGeneratorTool";
import HashGeneratorTool from "./HashGeneratorTool";
import CaseConverterTool from "./CaseConverterTool";
import ImageCompressorTool from "./ImageCompressorTool";
import TextDiffCheckerTool from "./TextDiffCheckerTool";
import LoremIpsumGeneratorTool from "./LoremIpsumGeneratorTool";
import ColorConverterTool from "./ColorConverterTool";
import UnitConverterTool from "./UnitConverterTool";
import TimestampConverterTool from "./TimestampConverterTool";
import MarkdownPreviewerTool from "./MarkdownPreviewerTool";
import CsvToJsonTool from "./CsvToJsonTool";
import UrlEncoderDecoderTool from "./UrlEncoderDecoderTool";

export type ToolComponent = ComponentType<Record<string, unknown>>;

export const TOOL_COMPONENTS: Record<string, ToolComponent> = {
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

export const TOOL_MAP = TOOL_COMPONENTS;
export const toolComponents = TOOL_COMPONENTS;

export function getToolComponent(slug: string): ToolComponent | undefined {
  return TOOL_COMPONENTS[slug];
}

export default TOOL_COMPONENTS;
