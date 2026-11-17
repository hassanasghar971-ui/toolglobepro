// Example helpers if referenced by category or summary views
export function getActiveCategories(tools: { category: string }[]) {
  const activeSlugs = new Set(tools.map((t) => t.category));
  return activeSlugs;
}

export function toSummary(text: string, maxLength = 160): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + "...";
}
