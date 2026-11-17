import { getCategory } from "@/lib/categories";
import { LEGAL_UPDATED_ISO } from "@/lib/site";
import type {
  Category,
  CategorySlug,
  ContentSection,
  FaqItem,
  IconName,
  Tool,
  ToolDefinition,
  ToolSummary,
} from "@/lib/types";

import wordCounterTool from "./word-counter";
import ipLookupTool from "./ip-lookup";
import passwordGeneratorTool from "./password-generator";
import base64ConverterTool from "./base64-converter";
import jsonFormatterTool from "./json-formatter";
import slugGeneratorTool from "./slug-generator";
import qrCodeGeneratorTool from "./qr-code-generator";

/* -------------------------------------------------------------------------- */
/*  Per-slug metadata that the authoring shape (`Tool`) does not carry         */
/* -------------------------------------------------------------------------- */

const CATEGORY_BY_SLUG: Record<string, CategorySlug> = {
  "word-counter": "text-tools",
  "ip-lookup": "network-tools",
  "password-generator": "security-tools",
  "base64-converter": "developer-tools",
  "json-formatter": "developer-tools",
  "slug-generator": "seo-tools",
  "qr-code-generator": "developer-tools",
  "hash-generator": "security-tools",
};

const CATEGORY_ALIASES: Record<string, CategorySlug> = {
  text: "text-tools",
  converters: "developer-tools",
  developer: "developer-tools",
  security: "security-tools",
  network: "network-tools",
  seo: "seo-tools",
};

const ICON_BY_SLUG: Record<string, IconName> = {
  "word-counter": "type",
  "ip-lookup": "globe",
  "password-generator": "key",
  "base64-converter": "refresh",
  "json-formatter": "braces",
  "slug-generator": "link",
  "qr-code-generator": "zap",
  "hash-generator": "hash",
};

const VALID_ICONS: ReadonlySet<string> = new Set<IconName>([
  "search", "sun", "moon", "menu", "x", "chevron-down", "chevron-right",
  "arrow-right", "type", "code", "shield", "globe", "link", "key", "braces",
  "file-text", "upload", "download", "copy", "check", "alert", "mail",
  "message", "home", "sparkles", "zap", "lock", "clock", "hash", "refresh",
  "trash", "map-pin", "external", "eye", "trending-up", "info",
]);

const MAX_FILE_MB_BY_SLUG: Record<string, number> = {
  "word-counter": 600,
  "base64-converter": 600,
  "json-formatter": 600,
  "hash-generator": 600,
};

const HOW_TO_BY_SLUG: Record<string, string[]> = {
  "word-counter": [
    "Paste or type your text into the box, or drop a text file onto it.",
    "Watch words, characters, sentences, paragraphs and reading time update live.",
    "Review the keyword density list to spot terms you may be overusing.",
  ],
  "ip-lookup": [
    "Open the tool and it detects your public IP address automatically.",
    "Or type any IPv4 or IPv6 address and run the lookup.",
    "Read the location, network and timezone details, and open the map link if you want to see the area.",
  ],
  "password-generator": [
    "Choose a length and the character sets you want, or switch to passphrase mode.",
    "Generate a new password. It is created locally with your browser's secure random generator.",
    "Copy it straight into your password manager.",
  ],
  "base64-converter": [
    "Pick Encode or Decode.",
    "Paste text or drop a file of up to 600 MB.",
    "Adjust URL-safe, padding or line-wrap options, then copy or download the result.",
  ],
  "json-formatter": [
    "Paste JSON or drop a file of up to 600 MB.",
    "Choose Format, Minify or Validate and set your indentation.",
    "Copy or download the result. Any error shows the exact line and column.",
  ],
  "slug-generator": [
    "Type or paste a title, or switch to bulk mode for a whole list.",
    "Choose the separator, stop-word and length options.",
    "Copy the slug, or export a bulk list as CSV.",
  ],
  "qr-code-generator": [
    "Choose a content type such as URL, Wi-Fi or contact card and fill in the details.",
    "Pick the error-correction level, size and colours.",
    "Download the code as PNG or SVG, or copy the image.",
  ],
  "hash-generator": [
    "Type text or drop a file of up to 600 MB.",
    "Tick the algorithms you need.",
    "Copy a digest, or paste an expected checksum to verify it.",
  ],
};

const DEFAULT_HOW_TO: string[] = [
  "Add your input by typing, pasting or dropping a file.",
  "Adjust the options to suit your task.",
  "Copy or download the result. Everything runs in your browser.",
];

/* -------------------------------------------------------------------------- */
/*  Small helpers                                                              */
/* -------------------------------------------------------------------------- */

const TITLE_SEPARATOR = /\s+[–—|-]\s+/;

function clamp(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  const base = space > max * 0.6 ? cut.slice(0, space) : cut;
  return base.replace(/[\s,;:–—-]+$/, "") + "…";
}

function leadTitle(seoTitle: string, fallback: string): string {
  const lead = seoTitle.split(TITLE_SEPARATOR)[0]?.trim();
  return lead && lead.length <= 44 ? lead : clamp(fallback, 44);
}

function firstSentence(text: string, max = 140): string {
  const match = text.match(/^.*?[.!?](?=\s|$)/);
  return clamp(match ? match[0] : text, max);
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function splitIntro(
  article: ContentSection[],
  fallback: string,
): { intro: string; sections: ContentSection[] } {
  const sections: ContentSection[] = article.map((section) => ({
    heading: section.heading,
    paragraphs: [...section.paragraphs],
  }));
  const first = sections[0];
  let intro = fallback;
  if (first && first.paragraphs.length > 0) {
    intro = first.paragraphs.shift() ?? fallback;
  }
  return {
    intro,
    sections: sections.filter((section) => section.paragraphs.length > 0),
  };
}

function isDefinition(tool: Tool | ToolDefinition): tool is ToolDefinition {
  return "metaTitle" in tool;
}

function toDefinition(tool: Tool | ToolDefinition): ToolDefinition {
  if (isDefinition(tool)) return tool;

  const category: CategorySlug =
    CATEGORY_BY_SLUG[tool.slug] ?? CATEGORY_ALIASES[tool.category] ?? "developer-tools";

  const icon: IconName =
    ICON_BY_SLUG[tool.slug] ??
    (VALID_ICONS.has(tool.icon) ? (tool.icon as IconName) : "code");

  const { intro, sections } = splitIntro(tool.article, tool.description);
  const faqs: FaqItem[] = tool.faqs.map((faq) => ({ q: faq.question, a: faq.answer }));
  const lead = leadTitle(tool.seoTitle, tool.name);

  return {
    slug: tool.slug,
    name: tool.name,
    h1: lead,
    tagline: firstSentence(tool.description),
    metaTitle: lead,
    metaDescription: clamp(tool.seoDescription, 160),
    category,
    icon,
    keywords: tool.keywords,
    intro,
    howTo: HOW_TO_BY_SLUG[tool.slug] ?? DEFAULT_HOW_TO,
    sections,
    faqs,
    features: [
      ...tool.keywords.slice(0, 6).map(capitalise),
      "Runs entirely in your browser",
      "Free, with no sign-up",
    ],
    schemaType: "WebApplication",
    maxFileMB: tool.maxFileMB ?? MAX_FILE_MB_BY_SLUG[tool.slug],
    related: tool.related,
    datePublished: LEGAL_UPDATED_ISO,
    dateModified: LEGAL_UPDATED_ISO,
  };
}

/* -------------------------------------------------------------------------- */
/*  Registry                                                                   */
/* -------------------------------------------------------------------------- */

const registry: Array<Tool | ToolDefinition> = [
  wordCounterTool,
  ipLookupTool,
  passwordGeneratorTool,
  base64ConverterTool,
  jsonFormatterTool,
  slugGeneratorTool,
  qrCodeGeneratorTool,
];

export const tools: ToolDefinition[] = registry.map(toDefinition);

const bySlug: ReadonlyMap<string, ToolDefinition> = new Map(
  tools.map((tool) => [tool.slug, tool] as const),
);

const CATEGORY_ORDER: CategorySlug[] = [
  "text-tools",
  "developer-tools",
  "security-tools",
  "network-tools",
  "seo-tools",
];

/* -------------------------------------------------------------------------- */
/*  Public API                                                                 */
/* -------------------------------------------------------------------------- */

export function getAllTools(): ToolDefinition[] {
  return tools;
}

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return bySlug.get(slug);
}

export function getToolsByCategory(slug: string): ToolDefinition[] {
  return tools.filter((tool) => tool.category === slug);
}

export function getRelatedTools(input: ToolDefinition | string, limit = 3): ToolDefinition[] {
  const current = typeof input === "string" ? bySlug.get(input) : input;
  if (!current) return [];

  const picked: ToolDefinition[] = [];
  const push = (candidate: ToolDefinition): void => {
    if (picked.length >= limit) return;
    if (candidate.slug === current.slug) return;
    if (picked.some((item) => item.slug === candidate.slug)) return;
    picked.push(candidate);
  };

  for (const slug of current.related ?? []) {
    const candidate = bySlug.get(slug);
    if (candidate) push(candidate);
  }
  tools.filter((tool) => tool.category === current.category).forEach(push);
  tools.forEach(push);
  return picked;
}

export function getActiveCategories(): Category[] {
  const used = new Set<string>(tools.map((tool) => tool.category));
  return CATEGORY_ORDER.filter((slug) => used.has(slug))
    .map((slug) => getCategory(slug))
    .filter((category): category is Category => Boolean(category));
}

export function toSummary(tool: ToolDefinition): ToolSummary {
  return {
    slug: tool.slug,
    name: tool.name,
    tagline: tool.tagline,
    category: tool.category,
    categoryName: getCategory(tool.category)?.name ?? tool.category,
    icon: tool.icon,
    keywords: tool.keywords,
    maxFileMB: tool.maxFileMB,
  };
}
