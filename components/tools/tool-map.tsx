import dynamic from "next/dynamic";
import type { ComponentType } from "react";

/**
 * TOOL COMPONENT MAP: slug → interactive client component (code-split per tool).
 * Add each new tool here AND in lib/tools/index.ts.
 */
export const TOOL_COMPONENTS: Record<string, ComponentType> = {
  "word-counter": dynamic(() => import("./WordCounterTool")),
  "ip-lookup": dynamic(() => import("./IpLookupTool")),
  "password-generator": dynamic(() => import("./PasswordGeneratorTool")),
  "base64-converter": dynamic(() => import("./Base64ConverterTool")),
  "json-formatter": dynamic(() => import("./JsonFormatterTool")),
  "slug-generator": dynamic(() => import("./SlugGeneratorTool")),
};
