import type { ComponentType } from "react";

import WordCounterTool from "./WordCounterTool";
import IpLookupTool from "./IpLookupTool";
import PasswordGeneratorTool from "./PasswordGeneratorTool";
import Base64ConverterTool from "./Base64ConverterTool";
import JsonFormatterTool from "./JsonFormatterTool";
import SlugGeneratorTool from "./SlugGeneratorTool";
import QrCodeGeneratorTool from "./QrCodeGeneratorTool";

export const TOOL_COMPONENTS: Record<string, ComponentType> = {
  "word-counter": WordCounterTool,
  "ip-lookup": IpLookupTool,
  "password-generator": PasswordGeneratorTool,
  "base64-converter": Base64ConverterTool,
  "json-formatter": JsonFormatterTool,
  "slug-generator": SlugGeneratorTool,
  "qr-code-generator": QrCodeGeneratorTool,
};

export const toolComponents = TOOL_COMPONENTS;

export function getToolComponent(slug: string): ComponentType | undefined {
  return TOOL_COMPONENTS[slug];
}
