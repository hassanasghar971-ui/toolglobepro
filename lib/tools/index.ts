import { getCategory } from "@/lib/categories";
import { LEGAL_UPDATED_ISO } from "@/lib/site";
import type {
  Category,
  CategorySlug,
  IconName,
  Tool,
  ToolDefinition,
  ToolSummary,
} from "@/lib/types";

import wordCounter from "./word-counter";
import ipLookup from "./ip-lookup";
import passwordGenerator from "./password-generator";
import base64Converter from "./base64-converter";
import jsonFormatter from "./json-formatter";
import slugGenerator from "./slug-generator";
import qrCodeGenerator from "./qr-code-generator";
import hashGenerator from "./hash-generator";
import caseConverter from "./case-converter";
import imageCompressor from "./image-compressor";

export type CategoryWithCount = Category & { count: number };

const CATEGORY_ORDER: CategorySlug[] = [
  "text-tools",
  "developer-tools",
  "security-tools",
  "network-tools",
  "seo-tools",
];

const CATEGORY_BY_SLUG: Record<string, CategorySlug> = {
  "word-counter": "text-tools",
  "case-converter": "text-tools",
  "ip-lookup": "network-tools",
  "password-generator": "security-tools",
  "hash-generator": "security-tools",
  "base64-converter": "developer-tools",
  "json-formatter": "developer-tools",
  "qr-code-generator": "developer-tools",
  "slug-generator": "seo-tools",
  "image-compressor": "seo-tools",
};

const CATEGORY_ALIASES: Record<string, CategorySlug> = {
  text: "text-tools",
  "text-tools": "text-tools",
  developer: "developer-tools",
  "developer-tools": "developer-tools",
  security: "security-tools",
  "security-tools": "security-tools",
  network: "network-tools",
  "network-tools": "network-tools",
  seo: "seo-tools",
  "seo-tools": "seo-tools",
};

const VALID_ICONS: ReadonlySet<string> = new Set([
  "search", "sun", "moon", "menu", "x", "chevron-down", "chevron-right", "arrow-right",
  "type", "code", "shield", "globe", "link", "key", "braces", "file-text", "upload",
  "download", "copy", "check", "alert", "mail", "message", "home", "sparkles", "zap",
  "lock", "clock", "hash", "refresh", "trash", "map-pin", "external", "eye",
  "trending-up", "info",
]);

const ICON_BY_SLUG: Record<string, IconName> = {
  "word-counter": "type",
  "case-converter": "file-text",
  "ip-lookup": "globe",
  "password-generator": "key",
  "hash-generator": "hash",
  "base64-converter": "refresh",
  "json-formatter": "braces",
  "qr-code-generator": "zap",
  "slug-generator": "link",
  "image-compressor": "sparkles",
};

const MAX_FILE_MB_BY_SLUG: Record<string, number> = {
  "word-counter": 600,
  "base64-converter": 600,
  "json-formatter": 600,
  "hash-generator": 600,
  "image-compressor": 600,
  "case-converter": 10,
};

const DEFAULT_HOW_TO: string[] = [
  "Open the tool in your browser — no sign-up or install needed.",
  "Enter your input or drop a file onto the page.",
  "Adjust the options you need and review the result.",
  "Copy or download the output.",
];

const HOW_TO_BY_SLUG: Record<string, string[]> = {
  "word-counter": [
    "Paste your text or drop a text file onto the page.",
    "Watch words, characters, sentences and reading time update live.",
    "Check keyword density to spot repeated words.",
    "Copy the stats or clear the box to start again.",
  ],
  "ip-lookup": [
    "Open the tool to see your own public IP address.",
    "Or type any IPv4 or IPv6 address to look it up.",
    "Review the country, city, ISP and timezone details.",
    "Use “View on map” to open the approximate location.",
  ],
  "password-generator": [
    "Choose a length and the character sets you want.",
    "Or switch to passphrase mode for easy-to-remember words.",
    "Press generate — passwords are created locally with secure randomness.",
    "Copy the password straight into your password manager.",
  ],
  "base64-converter": [
    "Pick Encode or Decode.",
    "Paste text or drop a file of up to 600 MB.",
    "Choose URL-safe output, padding and line-wrap options.",
    "Copy the result or download it instantly.",
  ],
  "json-formatter": [
    "Paste JSON or drop a .json file.",
    "Choose to format, minify or validate.",
    "Fix any error using the exact line and column shown.",
    "Copy or download the cleaned-up JSON.",
  ],
  "slug-generator": [
    "Type a title or paste a list of titles for bulk mode.",
    "Choose the separator, stop-word and length options.",
    "Review the clean, SEO-friendly slugs.",
    "Copy them or export a CSV.",
  ],
  "qr-code-generator": [
    "Choose what the QR code should contain: text, URL, Wi-Fi, contact and more.",
    "Fill in the details and pick an error-correction level.",
    "Check the live preview and test it with your phone.",
    "Download the code as PNG or SVG.",
  ],
  "hash-generator": [
    "Type text or drop a file of up to 600 MB.",
    "Tick the algorithms you need: MD5, SHA-1, SHA-256 or SHA-512.",
    "Watch progress while large files are hashed in the background.",
    "Copy a hash, compare it with an expected value, or download a checksum list.",
  ],
  "case-converter": [
    "Paste your text or drop a .txt file onto the input box.",
    "Click a case style, such as Sentence case, Title Case or camelCase.",
    "Review the result, which updates instantly.",
    "Copy it or download it as a .txt file.",
  ],
  "image-compressor": [
    "Drop one or many images onto the page.",
    "Pick the output format, quality and maximum width.",
    "Watch each file compress and compare the before and after sizes.",
    "Download single images or everything as a ZIP.",
  ],
};

const SEPARATORS = [" – ", " — ", " | ", " - "];
const MAX_META_TITLE = 44;
const MAX_META_DESCRIPTION = 160;

function metaTitleFor(tool: Tool): string {
  let cut = tool.seoTitle.length;
  for (const sep of SEPARATORS) {
    const index = tool.seoTitle.indexOf(sep);
    if (index > 0 && index < cut) cut = index;
  }
  const head = tool.seoTitle.slice(0, cut).trim();
  if (head.length > 0 && head.length <= MAX_META_TITLE) return head;
  return tool.name.length <= MAX_META_TITLE ? tool.name : tool.name.slice(0, MAX_META_TITLE);
}

function metaDescriptionFor(tool: Tool): string {
  const text = tool.seoDescription.trim();
  if (text.length <= MAX_META_DESCRIPTION) return text;
  return `${text.slice(0, MAX_META_DESCRIPTION - 1).trimEnd()}…`;
}

function resolveCategory(tool: Tool): CategorySlug {
  return CATEGORY_BY_SLUG[tool.slug] ?? CATEGORY_ALIASES[tool.category] ?? "developer-tools";
}

function resolveIcon(tool: Tool): IconName {
  const mapped = ICON_BY_SLUG[tool.slug];
  if (mapped) return mapped;
  return (VALID_ICONS.has(tool.icon) ? tool.icon : "sparkles") as IconName;
}

function featuresFor(maxFileMB: number | undefined): string[] {
  const features = [
    "100% client-side — your data never leaves your device",
    "Free to use with no sign-up",
    "Works on desktop, tablet and mobile",
    "Instant results with no waiting in a queue",
  ];
  if (maxFileMB !== undefined) {
    features.push(`Handles files up to ${maxFileMB} MB`);
  }
  return features;
}

function adapt(tool: Tool): ToolDefinition {
  const maxFileMB = MAX_FILE_MB_BY_SLUG[tool.slug] ?? tool.maxFileMB;
  const [first, ...rest] = tool.article;
  const intro = first?.paragraphs[0] ?? tool.description;

  const sections = [
    ...(first ? [{ ...first, paragraphs: first.paragraphs.slice(1) }] : []),
    ...rest,
  ].filter((section) => section.paragraphs.length > 0);

  return {
    slug: tool.slug,
    name: tool.name,
    h1: `Free ${tool.name} Online`,
    tagline: tool.description,
    metaTitle: metaTitleFor(tool),
    metaDescription: metaDescriptionFor(tool),
    category: resolveCategory(tool),
    icon: resolveIcon(tool),
    keywords: tool.keywords,
    intro,
    howTo: HOW_TO_BY_SLUG[tool.slug] ?? DEFAULT_HOW_TO,
    sections,
    faqs: tool.faqs.map((faq) => ({ q: faq.question, a: faq.answer })),
    features: featuresFor(maxFileMB),
    schemaType: "WebApplication",
    maxFileMB,
    related: tool.related,
    datePublished: LEGAL_UPDATED_ISO,
    dateModified: LEGAL_UPDATED_ISO,
  };
}

const SOURCE_TOOLS: Tool[] = [
  wordCounter,
  ipLookup,
  passwordGenerator,
  base64Converter,
  jsonFormatter,
  slugGenerator,
  qrCodeGenerator,
  hashGenerator,
  caseConverter,
  imageCompressor,
];

export const tools: ToolDefinition[] = SOURCE_TOOLS.map(adapt);

export function getAllTools(): ToolDefinition[] {
  return tools;
}

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.slug === slug);
}

export function getToolsByCategory(slug: string): ToolDefinition[] {
  return tools.filter((tool) => tool.category === slug);
}

export function getRelatedTools(
  toolOrSlug: ToolDefinition | string,
  limit = 3,
): ToolDefinition[] {
  const tool = typeof toolOrSlug === "string" ? getToolBySlug(toolOrSlug) : toolOrSlug;
  if (!tool) return [];

  const picked: ToolDefinition[] = [];
  const seen = new Set<string>([tool.slug]);
  const add = (candidate: ToolDefinition | undefined) => {
    if (candidate && !seen.has(candidate.slug) && picked.length < limit) {
      seen.add(candidate.slug);
      picked.push(candidate);
    }
  };

  for (const slug of tool.related ?? []) add(getToolBySlug(slug));
  for (const other of tools) if (other.category === tool.category) add(other);
  for (const other of tools) add(other);
  return picked;
}

export function getActiveCategories(): CategoryWithCount[] {
  const result: CategoryWithCount[] = [];
  for (const slug of CATEGORY_ORDER) {
    const count = tools.filter((tool) => tool.category === slug).length;
    if (count === 0) continue;
    const category = getCategory(slug);
    if (!category) continue;
    result.push({ ...category, count });
  }
  return result;
}

export function toSummary(tool: ToolDefinition): ToolSummary {
  const category = getCategory(tool.category);
  return {
    slug: tool.slug,
    name: tool.name,
    tagline: tool.tagline,
    category: tool.category,
    categoryName: category ? category.name : tool.category,
    icon: tool.icon,
    keywords: tool.keywords,
    maxFileMB: tool.maxFileMB,
  };
}
