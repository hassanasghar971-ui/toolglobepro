import { CATEGORIES, getCategory, resolveCategorySlug } from "../categories";
import { ICON_NAMES } from "../types";
import type {
  Category,
  CategorySlug,
  ContentSection,
  FaqItem,
  IconName,
  SchemaType,
  ToolDefinition,
  ToolSummary,
} from "../types";
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

export type CategoryWithCount = Category & { count: number };

interface LooseFaq {
  q?: string;
  a?: string;
  question?: string;
  answer?: string;
}

interface LooseSection {
  heading?: string;
  paragraphs?: string[];
  body?: unknown;
  content?: unknown;
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
  article?: LooseSection[];
  sections?: LooseSection[];
  faqs?: LooseFaq[];
  schemaType?: SchemaType;
  maxFileMB?: number;
  related?: string[];
  datePublished?: string;
  dateModified?: string;
}

const RAW_TOOLS: LooseTool[] = [
  wordCounterTool as unknown as LooseTool,
  ipLookupTool as unknown as LooseTool,
  passwordGeneratorTool as unknown as LooseTool,
  base64ConverterTool as unknown as LooseTool,
  jsonFormatterTool as unknown as LooseTool,
  slugGeneratorTool as unknown as LooseTool,
  qrCodeGeneratorTool as unknown as LooseTool,
  hashGeneratorTool as unknown as LooseTool,
  caseConverterTool as unknown as LooseTool,
  imageCompressorTool as unknown as LooseTool,
  textDiffCheckerTool as unknown as LooseTool,
  loremIpsumGeneratorTool as unknown as LooseTool,
  colorConverterTool as unknown as LooseTool,
  unitConverterTool as unknown as LooseTool,
  timestampConverterTool as unknown as LooseTool,
  markdownPreviewerTool as unknown as LooseTool,
  csvToJsonTool as unknown as LooseTool,
  urlEncoderDecoderTool as unknown as LooseTool,
];

const DEFAULT_CATEGORY: CategorySlug = "developer-tools";
const DEFAULT_PUBLISHED = "2026-01-01";
const DEFAULT_MODIFIED = "2026-11-26";

/* Central overrides. A tool listed here is placed in this category whatever its own definition says. A tool not listed uses the category written in its definition file. */
const CATEGORY_BY_SLUG: Partial<Record<string, CategorySlug>> = {
  "word-counter": "text-tools",
  "ip-lookup": "network-tools",
  "password-generator": "security-tools",
  "base64-converter": "developer-tools",
  "json-formatter": "developer-tools",
  "slug-generator": "seo-tools",
  "qr-code-generator": "generators",
  "hash-generator": "security-tools",
  "case-converter": "text-tools",
  "image-compressor": "image-tools",
  "text-diff-checker": "text-tools",
  "lorem-ipsum-generator": "generators",
  "color-converter": "design-color-tools",
  "unit-converter": "unit-converters",
  "timestamp-converter": "time-date-tools",
  "markdown-previewer": "document-text-helpers",
  "csv-to-json": "data-tools",
  "url-encoder-decoder": "encoding-decoding-tools",
};

const ICON_BY_SLUG: Partial<Record<string, IconName>> = {
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
  "csv-to-json": "braces",
  "url-encoder-decoder": "link",
};

const VALID_ICONS = new Set<string>(ICON_NAMES);

function isIconName(value: string): value is IconName {
  return VALID_ICONS.has(value);
}

function resolveCategory(raw: LooseTool): CategorySlug {
  const mapped = CATEGORY_BY_SLUG[raw.slug];
  if (mapped !== undefined) return mapped;
  const own = resolveCategorySlug(raw.category ?? "");
  return own ?? DEFAULT_CATEGORY;
}

function resolveIcon(raw: LooseTool): IconName {
  const mapped = ICON_BY_SLUG[raw.slug];
  if (mapped !== undefined) return mapped;
  const rawIcon = (raw.icon ?? "").trim();
  return isIconName(rawIcon) ? rawIcon : "code";
}

function toParagraphs(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (p): p is string => typeof p === "string" && p.trim().length > 0,
    );
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }
  return [];
}

function normalizeSections(raw: LooseTool): ContentSection[] {
  const hasSections = Array.isArray(raw.sections) && raw.sections.length > 0;
  const source: LooseSection[] = hasSections
    ? (raw.sections ?? [])
    : Array.isArray(raw.article)
      ? raw.article
      : [];
  const result: ContentSection[] = [];
  for (const sec of source) {
    let paragraphs = toParagraphs(sec.paragraphs);
    if (paragraphs.length === 0) paragraphs = toParagraphs(sec.body);
    if (paragraphs.length === 0) paragraphs = toParagraphs(sec.content);
    if (paragraphs.length === 0) continue;
    result.push({ heading: sec.heading ?? "Overview", paragraphs });
  }
  return result;
}

function normalizeFaqs(raw: LooseTool): FaqItem[] {
  if (!Array.isArray(raw.faqs)) return [];
  return raw.faqs
    .map((item) => ({
      q: item.q ?? item.question ?? "",
      a: item.a ?? item.answer ?? "",
    }))
    .filter((item) => item.q.length > 0 && item.a.length > 0);
}

function normalizeTool(raw: LooseTool): ToolDefinition {
  const category = resolveCategory(raw);
  const icon = resolveIcon(raw);
  const fallbackDesc = raw.description ?? raw.tagline ?? raw.name;
  const metaDesc = raw.metaDescription ?? raw.seoDescription ?? fallbackDesc;
  const metaTitle = raw.metaTitle ?? raw.seoTitle ?? raw.name;
  const sections = normalizeSections(raw);
  const firstPara = sections[0]?.paragraphs[0] ?? fallbackDesc;
  return {
    slug: raw.slug,
    name: raw.name,
    h1: raw.h1 ?? raw.name,
    tagline: raw.tagline ?? fallbackDesc,
    metaTitle,
    metaDescription: metaDesc,
    category,
    icon,
    keywords: Array.isArray(raw.keywords) ? raw.keywords : [raw.name.toLowerCase()],
    intro: raw.intro ?? firstPara,
    howTo:
      Array.isArray(raw.howTo) && raw.howTo.length > 0
        ? raw.howTo
        : [
            "Enter your input in the tool workspace.",
            "Review the output generated locally in your browser.",
            "Copy or download the result.",
          ],
    sections,
    faqs: normalizeFaqs(raw),
    features:
      Array.isArray(raw.features) && raw.features.length > 0
        ? raw.features
        : [
            "100% browser-based processing",
            "No server data upload",
            "Instant copy and export",
          ],
    schemaType: raw.schemaType ?? "WebApplication",
    maxFileMB: raw.maxFileMB,
    related: raw.related,
    datePublished: raw.datePublished ?? DEFAULT_PUBLISHED,
    dateModified: raw.dateModified ?? DEFAULT_MODIFIED,
  };
}

function assertUniqueSlugs(list: ToolDefinition[]): void {
  const seen = new Set<string>();
  for (const tool of list) {
    if (seen.has(tool.slug)) {
      throw new Error("Duplicate tool slug in registry: " + tool.slug);
    }
    seen.add(tool.slug);
  }
}

export const TOOLS: ToolDefinition[] = RAW_TOOLS.map(normalizeTool);

assertUniqueSlugs(TOOLS);

export function getAllTools(): ToolDefinition[] {
  return TOOLS;
}

export function getAllToolSlugs(): string[] {
  return TOOLS.map((t) => t.slug);
}

export function getToolBySlug(slug: string) {
  return TOOLS.find((t) => t.slug === slug);
}

export function getToolsByCategory(categorySlug: string): ToolDefinition[] {
  return TOOLS.filter((t) => t.category === categorySlug);
}

export function getRelatedTools(
  toolOrSlug: ToolDefinition | string,
  limit = 3,
): ToolDefinition[] {
  const current =
    typeof toolOrSlug === "string" ? getToolBySlug(toolOrSlug) : toolOrSlug;
  if (current === undefined) return TOOLS.slice(0, limit);

  const explicit: ToolDefinition[] = [];
  for (const slug of current.related ?? []) {
    const found = getToolBySlug(slug);
    if (
      found !== undefined &&
      found.slug !== current.slug &&
      !explicit.includes(found)
    ) {
      explicit.push(found);
    }
  }

  const sameCategory = TOOLS.filter(
    (t) =>
      t.slug !== current.slug &&
      t.category === current.category &&
      !explicit.includes(t),
  );
  const others = TOOLS.filter(
    (t) =>
      t.slug !== current.slug &&
      !explicit.includes(t) &&
      !sameCategory.includes(t),
  );
  return [...explicit, ...sameCategory, ...others].slice(0, limit);
}

export function toToolSummary(tool: ToolDefinition): ToolSummary {
  const category = getCategory(tool.category);
  return {
    slug: tool.slug,
    name: tool.name,
    tagline: tool.tagline,
    category: tool.category,
    categoryName: category?.name ?? "",
    icon: tool.icon,
    keywords: tool.keywords,
    maxFileMB: tool.maxFileMB,
  };
}

export { toToolSummary as toSummary };

export function getActiveCategories(): CategoryWithCount[] {
  const counts = new Map<string, number>();
  for (const tool of TOOLS) {
    counts.set(tool.category, (counts.get(tool.category) ?? 0) + 1);
  }
  return CATEGORIES.map((c) => ({ ...c, count: counts.get(c.slug) ?? 0 })).filter(
    (c) => c.count > 0,
  );
}
