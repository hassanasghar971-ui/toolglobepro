import { CATEGORIES } from "../categories";
import type { Category, CategorySlug, ContentSection, FaqItem, IconName, ToolDefinition, ToolSummary } from "../types";
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
  sections?: ContentSection[];
  faqs?: LooseFaq[];
  schemaType?: "WebApplication" | "SoftwareApplication";
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

const CATEGORY_ORDER: CategorySlug[] = CATEGORIES.map((c) => c.slug);

const CATEGORY_BY_SLUG: Record<string, CategorySlug> = {
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
  "unit-converters": "unit-converters",
  "unit-converter": "unit-converters",
  "timestamp-converter": "time-date-tools",
  "markdown-previewer": "document-text-helpers",
  "csv-to-json": "data-tools",
  "url-encoder-decoder": "encoding-decoding-tools",
};

const CATEGORY_ALIASES: Record<string, CategorySlug> = {
  text: "text-tools",
  "text-tools": "text-tools",
  developer: "developer-tools",
  "developer-tools": "developer-tools",
  converters: "converters",
  security: "security-tools",
  "security-tools": "security-tools",
  network: "network-tools",
  "network-tools": "network-tools",
  seo: "seo-tools",
  "seo-tools": "seo-tools",
  data: "data-tools",
  "data-tools": "data-tools",
  file: "file-tools",
  "file-tools": "file-tools",
  encoding: "encoding-decoding-tools",
  "encoding-decoding-tools": "encoding-decoding-tools",
  image: "image-tools",
  "image-tools": "image-tools",
  design: "design-color-tools",
  "design-color-tools": "design-color-tools",
  social: "social-media-tools",
  "social-media-tools": "social-media-tools",
  generators: "generators",
  time: "time-date-tools",
  "time-date-tools": "time-date-tools",
  math: "math-calculators",
  "math-calculators": "math-calculators",
  unit: "unit-converters",
  "unit-converters": "unit-converters",
  web: "web-utility-tools",
  "web-utility-tools": "web-utility-tools",
  productivity: "productivity-tools",
  "productivity-tools": "productivity-tools",
  privacy: "privacy-tools",
  "privacy-tools": "privacy-tools",
  document: "document-text-helpers",
  "document-text-helpers": "document-text-helpers",
};

const VALID_ICONS = new Set<string>([
  "search",
  "sun",
  "moon",
  "menu",
  "x",
  "chevron-down",
  "chevron-right",
  "arrow-right",
  "type",
  "code",
  "shield",
  "globe",
  "link",
  "key",
  "braces",
  "file-text",
  "upload",
  "download",
  "copy",
  "check",
  "alert",
  "mail",
  "message",
  "home",
  "sparkles",
  "zap",
  "lock",
  "clock",
  "hash",
  "refresh",
  "trash",
  "map-pin",
  "external",
  "eye",
  "trending-up",
  "info",
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
  "csv-to-json": "braces",
  "url-encoder-decoder": "link",
};

function resolveCategory(raw: LooseTool): CategorySlug {
  const mapped = CATEGORY_BY_SLUG[raw.slug];
  if (mapped) return mapped;
  const rawCat = (raw.category ?? "").trim().toLowerCase();
  const aliased = CATEGORY_ALIASES[rawCat];
  if (aliased) return aliased;
  return "developer-tools";
}

function resolveIcon(raw: LooseTool): IconName {
  const mapped = ICON_BY_SLUG[raw.slug];
  if (mapped) return mapped;
  const rawIcon = (raw.icon ?? "").trim();
  if (VALID_ICONS.has(rawIcon)) return rawIcon as IconName;
  return "code";
}

function normalizeSections(raw: LooseTool): ContentSection[] {
  if (Array.isArray(raw.sections) && raw.sections.length > 0) {
    return raw.sections;
  }
  if (Array.isArray(raw.article) && raw.article.length > 0) {
    return raw.article.map((sec) => ({
      heading: sec.heading ?? "Overview",
      paragraphs: Array.isArray(sec.paragraphs) ? sec.paragraphs : [],
    }));
  }
  return [];
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
    howTo: Array.isArray(raw.howTo) && raw.howTo.length > 0 ? raw.howTo : ["Enter your input in the tool workspace.", "Review the output generated locally in your browser.", "Copy or download the result."],
    sections,
    faqs: normalizeFaqs(raw),
    features: Array.isArray(raw.features) && raw.features.length > 0 ? raw.features : ["100% browser-based processing", "No server data upload", "Instant copy and export"],
    schemaType: raw.schemaType ?? "WebApplication",
    maxFileMB: raw.maxFileMB,
    related: raw.related,
    datePublished: raw.datePublished ?? "2026-01-01",
    dateModified: raw.dateModified ?? "2026-11-26",
  };
}

export const TOOLS: ToolDefinition[] = RAW_TOOLS.map(normalizeTool);

export function getAllTools(): ToolDefinition[] {
  return TOOLS;
}

export function getAllToolSlugs(): string[] {
  return TOOLS.map((t) => t.slug);
}

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function getToolsByCategory(categorySlug: string): ToolDefinition[] {
  return TOOLS.filter((t) => t.category === categorySlug);
}

export function getRelatedTools(toolOrSlug: ToolDefinition | string, limit = 3): ToolDefinition[] {
  const current = typeof toolOrSlug === "string" ? getToolBySlug(toolOrSlug) : toolOrSlug;
  if (!current) return TOOLS.slice(0, limit);
  const explicit = (current.related ?? [])
    .map((s) => getToolBySlug(s))
    .filter((t): t is ToolDefinition => Boolean(t) && t.slug !== current.slug);
  const sameCategory = TOOLS.filter(
    (t) => t.slug !== current.slug && t.category === current.category && !explicit.includes(t)
  );
  const others = TOOLS.filter(
    (t) => t.slug !== current.slug && !explicit.includes(t) && !sameCategory.includes(t)
  );
  return [...explicit, ...sameCategory, ...others].slice(0, limit);
}

export function toToolSummary(tool: ToolDefinition): ToolSummary {
  const category = CATEGORIES.find((c) => c.slug === tool.category);
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
  const ordered = [...CATEGORIES].sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a.slug);
    const ib = CATEGORY_ORDER.indexOf(b.slug);
    const va = ia < 0 ? 999 : ia;
    const vb = ib < 0 ? 999 : ib;
    return va - vb;
  });
  return ordered
    .map((c) => ({ ...c, count: getToolsByCategory(c.slug).length }))
    .filter((c) => c.count > 0);
}
