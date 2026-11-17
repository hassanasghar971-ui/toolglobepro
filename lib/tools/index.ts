import type { ToolDefinition } from "../types";
import { wordCounter } from "./word-counter";
import { ipLookup } from "./ip-lookup";
import { passwordGenerator } from "./password-generator";

export const TOOLS: ToolDefinition[] = [
  wordCounter,
  ipLookup,
  passwordGenerator,
];

export function getAllTools(): ToolDefinition[] {
  return TOOLS;
}

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function getToolsByCategory(category: string): ToolDefinition[] {
  return TOOLS.filter((t) => t.category === category);
}

export function getRelatedTools(tool: ToolDefinition, limit = 3): ToolDefinition[] {
  const explicit = (tool.related ?? [])
    .map((s) => getToolBySlug(s))
    .filter((t): t is ToolDefinition => Boolean(t));
  const sameCategory = TOOLS.filter(
    (t) => t.slug !== tool.slug && t.category === tool.category && !explicit.includes(t),
  );
  const rest = TOOLS.filter(
    (t) => t.slug !== tool.slug && !explicit.includes(t) && !sameCategory.includes(t),
  );
  return [...explicit, ...sameCategory, ...rest].slice(0, limit);
}

export function toSummary(tool: ToolDefinition) {
  return {
    slug: tool.slug,
    name: tool.name,
    tagline: tool.tagline,
    category: tool.category,
    categoryName: tool.category,
    icon: tool.icon,
    keywords: tool.keywords,
    maxFileMB: tool.maxFileMB,
  };
}

export function getActiveCategories() {
  const categories = [
    { slug: "text-tools", name: "Text & Writing Tools", icon: "type" },
    { slug: "developer-tools", name: "Developer Tools", icon: "code" },
    { slug: "security-tools", name: "Security & Privacy Tools", icon: "shield" },
    { slug: "network-tools", name: "Network & IP Tools", icon: "globe" },
    { slug: "seo-tools", name: "SEO & Web Tools", icon: "trending-up" },
  ];
  return categories.map((c) => ({
    ...c,
    count: getToolsByCategory(c.slug).length,
  })).filter((c) => c.count > 0);
}
