import type {
  Category,
  CategorySlug,
  ContentSection,
  FaqItem,
  IconName,
  ToolDefinition,
  ToolSummary,
} from "@/lib/types";
import { getCategory } from "@/lib/categories";
import { LEGAL_UPDATED_ISO } from "@/lib/site";

import { EXTRA_TOOLS } from "./extra";
import wordCounterTool from "./word-counter";
import ipLookupTool from "./ip-lookup";
import passwordGeneratorTool from "./password-generator";
import base64ConverterTool from "./base64-converter";
import jsonFormatterTool from "./json-formatter";
import slugGeneratorTool from "./slug-generator";
import qrCodeGeneratorTool from "./qr-code-generator";
import hashGeneratorTool from "./hash-generator";
import caseConverterTool from "./case-converter";
import imageCompressorTool from "./image-compressor";
import textDiffCheckerTool from "./text-diff-checker";
import loremIpsumGeneratorTool from "./lorem-ipsum-generator";
import colorConverterTool from "./color-converter";
import unitConverterTool from "./unit-converter";
import timestampConverterTool from "./timestamp-converter";
import markdownPreviewerTool from "./markdown-previewer";
import csvToJsonTool from "./csv-to-json";
import urlEncoderDecoderTool from "./url-encoder-decoder";
import imageFormatConverterTool from "./image-format-converter";
import imageMetadataRemoverTool from "./image-metadata-remover";

export type CategoryWithCount = Category & { count: number };
export type ToolSlug = string;

interface LooseFaq {
  q?: string;
  a?: string;
  question?: string;
  answer?: string;
}

interface LooseTool {
  slug: string;
  name: string;
  h1?: string;
  description?: string;
  tagline?: string;
  metaTitle?: string;
  metaDescription?: string;
  seoTitle?: string;
  seoDescription?: string;
  category?: string;
  icon?: string;
  keywords?: string[];
  intro?: string;
  howTo?: string[];
  features?: string[];
  article?: ContentSection[];
  sections?: ContentSection[];
  faqs?: LooseFaq[];
  maxFileMB?: number;
  related?: string[];
  datePublished?: string;
  dateModified?: string;
}

/*
  Older tools are listed here. New tools go into ./extra.ts, which is
  spread in at the end. A new tool only needs its own definition file:
  its category and icon are read from that file.
*/
const RAW_TOOLS = [
  wordCounterTool,
  ipLookupTool,
  passwordGeneratorTool,
  base64ConverterTool,
  jsonFormatterTool,
  slugGeneratorTool,
  qrCodeGeneratorTool,
  hashGeneratorTool,
  caseConverterTool,
  imageCompressorTool,
  textDiffCheckerTool,
  loremIpsumGeneratorTool,
  colorConverterTool,
  unitConverterTool,
  timestampConverterTool,
  markdownPreviewerTool,
  csvToJsonTool,
  urlEncoderDecoderTool,
  imageFormatConverterTool,
  imageMetadataRemoverTool,
  ...EXTRA_TOOLS,
] as unknown as LooseTool[];

const FALLBACK_CATEGORY: CategorySlug = "text-tools";

/*
  Display order only. A category not listed here still appears,
  after the listed ones, as soon as one tool uses it.
*/
const PREFERRED_ORDER: string[] = [
  "text-tools",
  "developer-tools",
  "security-tools",
  "network-tools",
  "seo-tools",
  "data-tools",
  "file-tools",
  "converters",
  "encoding-decoding-tools",
  "image-tools",
  "design-color-tools",
  "social-media-tools",
  "generators",
  "time-date-tools",
  "math-calculators",
  "unit-converters",
  "web-utility-tools",
  "productivity-tools",
  "privacy-tools",
  "document-text-helpers",
];

/* Overrides for the older tools. New tools do not need an entry here. */
const CATEGORY_BY_SLUG: Record<string, CategorySlug> = {
  "word-counter": "text-tools",
  "case-converter": "text-tools",
  "text-diff-checker": "text-tools",
  "base64-converter": "developer-tools",
  "json-formatter": "developer-tools",
  "password-generator": "security-tools",
  "hash-generator": "security-tools",
  "qr-code-generator": "generators",
  "lorem-ipsum-generator": "generators",
  "ip-lookup": "network-tools",
  "slug-generator": "seo-tools",
  "image-compressor": "image-tools",
  "color-converter": "design-color-tools",
  "unit-converter": "unit-converters",
  "timestamp-converter": "time-date-tools",
  "markdown-previewer": "document-text-helpers",
  "csv-to-json": "data-tools",
  "url-encoder-decoder": "encoding-decoding-tools",
  "image-format-converter": "converters",
  "image-metadata-remover": "privacy-tools",
};

const CATEGORY_ALIASES: Record<string, CategorySlug> = {
  text: "text-tools",
  developer: "developer-tools",
  privacy: "privacy-tools",
  security: "security-tools",
  network: "network-tools",
  seo: "seo-tools",
};

const VALID_ICONS = new Set<string>([
  "search", "sun", "moon", "menu", "x", "chevron-down",
  "chevron-right", "arrow-right", "type", "code", "shield", "globe",
  "link", "key", "braces", "file-text", "upload", "download",
  "copy", "check", "alert", "mail", "message", "home",
  "sparkles", "zap", "lock", "clock", "hash", "refresh",
  "trash", "map-pin", "external", "eye", "trending-up", "info",
]);

const ICON_BY_SLUG: Record<string, IconName> = {
  "word-counter": "type",
  "ip-lookup": "globe",
  "password-generator": "key",
  "base64-converter": "refresh",
  "json-formatter": "braces",
  "slug-generator": "link",
  "qr-code-generator": "zap",
  "hash-generator": "hash",
  "case-converter": "file-text",
  "image-compressor": "sparkles",
  "text-diff-checker": "eye",
  "lorem-ipsum-generator": "message",
  "color-converter": "sparkles",
  "unit-converter": "trending-up",
  "timestamp-converter": "clock",
  "markdown-previewer": "file-text",
  "csv-to-json": "code",
  "url-encoder-decoder": "link",
  "image-format-converter": "refresh",
  "image-metadata-remover": "eye",
};

const MAX_FILE_MB_BY_SLUG: Record<string, number> = {
  "image-compressor": 50,
  "image-format-converter": 100,
  "image-metadata-remover": 600,
  "csv-to-json": 600,
  "url-encoder-decoder": 600,
  "markdown-previewer": 600,
};

const DEFAULT_HOW_TO: string[] = [
  "Enter or paste your input into the workspace.",
  "Adjust any available options to match your format or requirement.",
  "Review the generated output, copy it to your clipboard, or download the result.",
];

function featuresFor(maxFileMB?: number): string[] {
  const base = [
    "Runs directly in your browser with zero server uploads",
    "Instant results with copy and clear controls",
    "Responsive layout for desktop and mobile browsers",
  ];
  if (maxFileMB !== undefined) {
    base.splice(1, 0, "Supports files up to " + maxFileMB + " MB");
  }
  return base;
}

function clipAtWord(text: string, max: number, ellipsis: boolean): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const limit = ellipsis ? max - 1 : max;
  let cut = clean.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > limit * 0.6) cut = cut.slice(0, lastSpace);
  cut = cut.replace(/[\s,;:.\u2013\u2014-]+$/, "");
  return ellipsis ? cut + "\u2026" : cut;
}

function deriveMetaTitle(name: string, seoTitle?: string): string {
  if (seoTitle) {
    const head = (seoTitle.split(/\s[\u2013\u2014\u007c-]\s/)[0] ?? "").trim();
    if (head && head.length <= 44) return head;
  }
  return clipAtWord(name, 44, false);
}

function pickDate(fallback: string, value?: string): string {
  if (value === undefined) return fallback;
  if (!/^\d{4}-\d{2}-\d{2}/.test(value)) return fallback;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return fallback;
  if (parsed > Date.now() + 86400000) return fallback;
  return value;
}

function toFaqs(faqs?: LooseFaq[]): FaqItem[] {
  const out: FaqItem[] = [];
  for (const faq of faqs ?? []) {
    const q = faq.q ?? faq.question ?? "";
    const a = faq.a ?? faq.answer ?? "";
    if (q && a) out.push({ q, a });
  }
  return out;
}

function copySections(list: ContentSection[]): ContentSection[] {
  return list.map((section) => ({
    heading: section.heading,
    paragraphs: [...section.paragraphs],
  }));
}

function splitArticle(
  introText?: string,
  sections?: ContentSection[],
  article?: ContentSection[]
): { intro: string; sections: ContentSection[] } {
  if (sections && sections.length > 0) {
    return {
      intro: introText ?? "",
      sections: copySections(sections).filter((s) => s.paragraphs.length > 0),
    };
  }
  const source = copySections(article ?? []);
  let intro = introText ?? "";
  const first = source[0];
  if (!intro && first && first.paragraphs.length > 0) {
    intro = first.paragraphs.shift() ?? "";
  }
  return {
    intro,
    sections: source.filter((s) => s.paragraphs.length > 0),
  };
}

function resolveCategory(raw: LooseTool): CategorySlug {
  const central = CATEGORY_BY_SLUG[raw.slug];
  if (central) return central;
  const own = raw.category ?? "";
  if (getCategory(own as CategorySlug)) return own as CategorySlug;
  const alias = CATEGORY_ALIASES[own];
  if (alias) return alias;
  return FALLBACK_CATEGORY;
}

function resolveIcon(raw: LooseTool): IconName {
  const central = ICON_BY_SLUG[raw.slug];
  if (central) return central;
  const own = raw.icon ?? "";
  return (VALID_ICONS.has(own) ? own : "sparkles") as IconName;
}

function adapt(raw: LooseTool): ToolDefinition {
  const slug = raw.slug;
  const maxFileMB = MAX_FILE_MB_BY_SLUG[slug] ?? raw.maxFileMB;
  const { intro, sections } = splitArticle(raw.intro, raw.sections, raw.article);
  const description = raw.description ?? raw.tagline ?? raw.name;
  const definition: ToolDefinition = {
    slug,
    name: raw.name,
    h1: raw.h1 ?? "Free " + raw.name + " Online",
    tagline: raw.tagline ?? description,
    metaTitle: deriveMetaTitle(raw.name, raw.metaTitle ?? raw.seoTitle),
    metaDescription: clipAtWord(
      raw.metaDescription ?? raw.seoDescription ?? description,
      160,
      true
    ),
    category: resolveCategory(raw),
    icon: resolveIcon(raw),
    keywords: raw.keywords ?? [],
    intro: intro || description,
    howTo: raw.howTo ?? DEFAULT_HOW_TO,
    sections,
    faqs: toFaqs(raw.faqs),
    features: raw.features ?? featuresFor(maxFileMB),
    schemaType: "WebApplication",
    related: raw.related,
    datePublished: pickDate(LEGAL_UPDATED_ISO, raw.datePublished),
    dateModified: pickDate(LEGAL_UPDATED_ISO, raw.dateModified),
  };
  if (maxFileMB !== undefined) definition.maxFileMB = maxFileMB;
  return definition;
}

function assertUniqueSlugs(list: ToolDefinition[]): void {
  const seen = new Set<string>();
  for (const item of list) {
    if (seen.has(item.slug)) {
      throw new Error("Duplicate tool slug: " + item.slug);
    }
    seen.add(item.slug);
  }
}

export const tools: ToolDefinition[] = RAW_TOOLS.map(adapt);
assertUniqueSlugs(tools);

export const TOOLS = tools;

export function getAllTools(): ToolDefinition[] {
  return tools;
}

export function getAllToolSlugs(): string[] {
  return tools.map((tool) => tool.slug);
}

export function getToolBySlug(slug: string) {
  return tools.find((tool) => tool.slug === slug);
}

export function getToolsByCategory(slug: string): ToolDefinition[] {
  return tools.filter((tool) => tool.category === slug);
}

export function getRelatedTools(toolOrSlug: string, limit?: number): ToolDefinition[];
export function getRelatedTools(toolOrSlug: ToolDefinition, limit?: number): ToolDefinition[];
export function getRelatedTools(toolOrSlug: unknown, limit = 3): ToolDefinition[] {
  const tool =
    typeof toolOrSlug === "string"
      ? getToolBySlug(toolOrSlug)
      : (toolOrSlug as ToolDefinition);
  if (!tool) return [];
  const picked: ToolDefinition[] = [];
  const seen = new Set<string>([tool.slug]);
  const add = (candidate?: ToolDefinition) => {
    if (candidate && !seen.has(candidate.slug) && picked.length < limit) {
      seen.add(candidate.slug);
      picked.push(candidate);
    }
  };
  (tool.related ?? []).forEach((s) => add(getToolBySlug(s)));
  tools.filter((t) => t.category === tool.category).forEach((t) => add(t));
  tools.forEach((t) => add(t));
  return picked;
}

function orderOf(slug: string): number {
  const index = PREFERRED_ORDER.indexOf(slug);
  return index === -1 ? PREFERRED_ORDER.length : index;
}

export function getActiveCategories(): CategoryWithCount[] {
  const slugs: string[] = [];
  for (const tool of tools) {
    if (!slugs.includes(tool.category)) slugs.push(tool.category);
  }
  slugs.sort((a, b) => orderOf(a) - orderOf(b));
  const result: CategoryWithCount[] = [];
  for (const slug of slugs) {
    const category = getCategory(slug as CategorySlug);
    if (!category) continue;
    result.push({ ...category, count: getToolsByCategory(slug).length });
  }
  return result;
}

export function toToolSummary(tool: ToolDefinition): ToolSummary {
  const categoryMeta = getCategory(tool.category);
  const summary: ToolSummary = {
    slug: tool.slug,
    name: tool.name,
    tagline: tool.tagline,
    category: tool.category,
    categoryName: categoryMeta?.name ?? tool.category,
    icon: tool.icon,
    keywords: tool.keywords,
  };
  if (tool.maxFileMB !== undefined) summary.maxFileMB = tool.maxFileMB;
  return summary;
}

export { toToolSummary as toSummary };
