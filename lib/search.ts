import type { Category, IconName, ToolDefinition } from "./types";
import { getCategory } from "./categories";

export interface SearchEntry {
  slug: string;
  name: string;
  tagline: string;
  categoryName: string;
  keywords: string[];
  icon: IconName;
}

/*
  Category names come from the shared category lookup, so adding a
  category never requires touching this file. An explicit list can still
  be passed in and takes priority.
*/
export function buildSearchIndex(tools: ToolDefinition[], categories?: Category[]): SearchEntry[] {
  const overrides = new Map<string, string>();
  if (categories) {
    for (const c of categories) overrides.set(c.slug, c.name);
  }
  return tools.map((t) => ({
    slug: t.slug,
    name: t.name,
    tagline: t.tagline,
    categoryName: overrides.get(t.category) ?? getCategory(t.category)?.name ?? "",
    keywords: t.keywords,
    icon: t.icon,
  }));
}

export function searchEntries(entries: SearchEntry[], query: string, limit = 8): SearchEntry[] {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return entries.slice(0, limit);

  const scored: { entry: SearchEntry; score: number }[] = [];
  for (const entry of entries) {
    const name = entry.name.toLowerCase();
    const tagline = entry.tagline.toLowerCase();
    const category = entry.categoryName.toLowerCase();
    const keywords = entry.keywords.map((k) => k.toLowerCase());
    let total = 0;
    let allMatched = true;
    for (const token of tokens) {
      let s = 0;
      if (name.startsWith(token)) s += 10;
      else if (name.includes(token)) s += 6;
      if (keywords.some((k) => k.startsWith(token))) s += 5;
      else if (keywords.some((k) => k.includes(token))) s += 3;
      if (tagline.includes(token)) s += 2;
      if (category.includes(token)) s += 1;
      if (s === 0) {
        allMatched = false;
        break;
      }
      total += s;
    }
    if (allMatched) scored.push({ entry, score: total });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.entry.name.localeCompare(b.entry.name))
    .slice(0, limit)
    .map((s) => s.entry);
}
