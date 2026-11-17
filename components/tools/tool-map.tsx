import type { ComponentType } from "react";
import { WordCounterTool } from "@/components/tools/WordCounterTool";
import { IpLookupTool } from "@/components/tools/IpLookupTool";
import { PasswordGeneratorTool } from "@/components/tools/PasswordGeneratorTool";
import { Base64ConverterTool } from "@/components/tools/Base64ConverterTool";
import { JsonFormatterTool } from "@/components/tools/JsonFormatterTool";
import { SlugGeneratorTool } from "@/components/tools/SlugGeneratorTool";
import { HashGeneratorTool } from "@/components/tools/HashGeneratorTool";
import { QrCodeGeneratorTool } from "@/components/tools/QrCodeGeneratorTool";

export const toolComponents: Record<string, ComponentType> = {
  "word-counter": WordCounterTool,
  "ip-lookup": IpLookupTool,
  "password-generator": PasswordGeneratorTool,
  "base64-converter": Base64ConverterTool,
  "json-formatter": JsonFormatterTool,
  "slug-generator": SlugGeneratorTool,
  "hash-generator": HashGeneratorTool,
  "qr-code-generator": QrCodeGeneratorTool,
};

export function getToolComponent(slug: string): ComponentType | undefined {
  return toolComponents[slug];
}
