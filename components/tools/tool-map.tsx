import type { ComponentType } from "react";
import { WordCounterTool } from "@/components/tools/WordCounterTool";
import { IpLookupTool } from "@/components/tools/IpLookupTool";
import { PasswordGeneratorTool } from "@/components/tools/PasswordGeneratorTool";

/* No "use client" here: this module stays server-compatible so that
   app/tools/[slug]/page.tsx can look a component up by slug and render it.
   Each tool component carries its own "use client" directive. */
export const toolComponents: Record<string, ComponentType> = {
  "word-counter": WordCounterTool,
  "ip-lookup": IpLookupTool,
  "password-generator": PasswordGeneratorTool,
};

export function getToolComponent(slug: string): ComponentType | null {
  return toolComponents[slug] ?? null;
}
