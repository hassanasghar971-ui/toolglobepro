import type { Tool } from "@/lib/types";
import { wordCounterTool } from "./word-counter";
import { ipLookupTool } from "./ip-lookup";
import { passwordGeneratorTool } from "./password-generator";
import { base64ConverterTool } from "./base64-converter";
import { jsonFormatterTool } from "./json-formatter";
import { slugGeneratorTool } from "./slug-generator";

export const tools: Tool[] = [
  wordCounterTool,
  ipLookupTool,
  passwordGeneratorTool,
  base64ConverterTool,
  jsonFormatterTool,
  slugGeneratorTool,
];

export function getAllTools(): Tool[] {
  return tools;
}

export function getAllToolSlugs(): string[] {
  return tools.map((t) => t.slug);
}

export function getToolBySlug(slug: string): Tool | undefined {
  return tools.find((t) => t.slug === slug);
}

export function getToolsByCategory(categorySlug: string): Tool[] {
  return tools.filter((t) => t.category === categorySlug);
}

export function getRelatedTools(slug: string, limit = 3): Tool[] {
  const current = getToolBySlug(slug);
  if (!current) return tools.slice(0, limit);
  const sameCategory = tools.filter((t) => t.slug !== slug && t.category === current.category);
  const others = tools.filter((t) => t.slug !== slug && t.category !== current.category);
  return [...sameCategory, ...others].slice(0, limit);
}
