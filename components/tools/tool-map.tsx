import type { ComponentType } from "react";
import { WordCounterTool } from "@/components/tools/WordCounterTool";
import { IpLookupTool } from "@/components/tools/IpLookupTool";
import { PasswordGeneratorTool } from "@/components/tools/PasswordGeneratorTool";
import { Base64ConverterTool } from "@/components/tools/Base64ConverterTool";
import { JsonFormatterTool } from "@/components/tools/JsonFormatterTool";

export const toolComponents: Record<string, ComponentType> = {
  "word-counter": WordCounterTool,
  "ip-lookup": IpLookupTool,
  "password-generator": PasswordGeneratorTool,
  "base64-converter": Base64ConverterTool,
  "json-formatter":JsonFormatterTool,
};

export function getToolComponent(slug: string): ComponentType | undefined {
  return toolComponents[slug];
}
