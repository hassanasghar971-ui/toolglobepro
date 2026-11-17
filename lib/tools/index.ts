import type { Tool } from "@/lib/types";
import { wordCounterTool } from "./word-counter";
import { ipLookupTool } from "./ip-lookup";
import { passwordGeneratorTool } from "./password-generator";

export const tools: Tool[] = [wordCounterTool, ipLookupTool, passwordGeneratorTool];

const toolsBySlug = new Map<string, Tool>(tools.map((tool) => [tool.slug, tool]));

export function getAllTools(): Tool[] {
  return tools;
}

export function getAllToolSlugs(): string[] {
  return tools.map((tool) => tool.slug);
}

export function getToolBySlug(slug: string): Tool | undefined {
  return toolsBySlug.get(slug);
}

export function getToolsByCategory(category: string): Tool[] {
  return tools.filter((tool) => tool.category === category);
}

export function getRelatedTools(slug: string, limit = 3): Tool[] {
  const current = toolsBySlug.get(slug);
  if (!current) return tools.slice(0, limit);
  const sameCategory = tools.filter((tool) => tool.slug !== slug && tool.category === current.category);
  const others = tools.filter((tool) => tool.slug !== slug && tool.category !== current.category);
  return [...sameCategory, ...others].slice(0, limit);
}
