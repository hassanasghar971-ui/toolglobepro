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

export const TOOL_COMPONENTS: Record<string, ComponentType> = {
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
};

export const toolComponents = TOOL_COMPONENTS;

export function getToolComponent(slug: string): ComponentType | undefined {
  return TOOL_COMPONENTS[slug];
}
