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
import imageMetadataRemover from "./image-metadata-remover";

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
}

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
  imageMetadataRemover,
] as unknown as LooseTool[];

const CATEGORY_ORDER: CategorySlug[] = [
  "text-tools",
  "developer-tools",
  "security-tools",
  "network-tools",
  "seo-tools",
];

const CATEGORY_BY_SLUG: Record<string, CategorySlug> = {
  "word-counter": "text-tools",
  "ip-lookup": "network-tools",
  "password-generator": "security-tools",
  "base64-converter": "developer-tools",
  "json-formatter": "developer-tools",
  "slug-generator": "seo-tools",
  "qr-code-generator": "developer-tools",
  "hash-generator": "security-tools",
  "case-converter": "text-tools",
  "image-compressor": "seo-tools",
  "text-diff-checker": "text-tools",
  "lorem-ipsum-generator": "text-tools",
  "color-converter": "developer-tools",
  "unit-converter": "developer-tools",
  "timestamp-converter": "developer-tools",
  "markdown-previewer": "developer-tools",
  "csv-to-json": "developer-tools",
  "url-encoder-decoder": "developer-tools",
};

const CATEGORY_ALIASES: Record<string, CategorySlug> = {
  text: "text-tools",
  "text-tools": "text-tools",
  developer: "developer-tools",
  "developer-tools": "developer-tools",
  converters: "developer-tools",
  security: "security-tools",
  "security-tools": "security-tools",
  network: "network-tools",
  "network-tools": "network-tools",
  seo: "seo-tools",
  "seo-tools": "seo-tools",
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
  "csv-to-json": "code",
  "url-encoder-decoder": "link",
};

const MAX_FILE_MB_BY_SLUG: Record<string, number> = {
  "image-compressor": 50,
  "csv-to-json": 600,
  "url-encoder-decoder": 600,
  "markdown-previewer": 600,
};

const DEFAULT_HOW_TO: string[] = [
  "Enter or paste your input into the workspace.",
  "Adjust any available options to match your format or requirement.",
  "Review the generated output, copy it to your clipboard, or download the result.",
];

const HOW_TO_BY_SLUG: Record<string, string[]> = {};

function featuresFor(maxFileMB: number | undefined): string[] {
  const base = [
    "Runs directly in your browser with zero server uploads",
    "Instant results with copy and clear controls",
    "Responsive layout for desktop and mobile browsers",
  ];
  if (maxFileMB !== undefined) {
    base.splice(1, 0, `Supports files up to ${maxFileMB} MB`);
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
  cut = cut.replace(/[\s,;:.-–—]+$/, "");
  return ellipsis ? `${cut}…` : cut;
}

function deriveMetaTitle(seoTitle: string | undefined, name: string): string {
  if (seoTitle) {
    const head = seoTitle.split(/\s[–—|-]\s/)[0].trim();
    if (head && head.length <= 44) return head;
  }
  return clipAtWord(name, 44, false);
}

function toFaqs(faqs: LooseFaq[] | undefined): FaqItem[] {
  const out: FaqItem[] = [];
  for (const faq of faqs ?? []) {
    const q = faq.q ?? faq.question ?? "";
    const a = faq.a ?? faq.answer ?? "";
    if (q && a) out.push({ q, a });
  }
  return out;
}

function splitArticle(
  article: ContentSection[] | undefined,
  sections: ContentSection[] | undefined,
  introText: string | undefined
): { intro: string; sections: ContentSection[] } {
  if (sections && sections.length > 0) {
    const cleaned = sections.map((section) => ({
      heading: section.heading,
      paragraphs: [...section.paragraphs],
    }));
    return {
      intro: introText ?? "",
      sections: cleaned.filter((section) => section.paragraphs.length > 0),
    };
  }
  const source = (article ?? []).map((section) => ({
    heading: section.heading,
    paragraphs: [...section.paragraphs],
  }));
  let intro = introText ?? "";
  if (!intro && source.length > 0 && source[0].paragraphs.length > 0) {
    intro = source[0].paragraphs.shift() ?? "";
  }
  return {
    intro,
    sections: source.filter((section) => section.paragraphs.length > 0),
  };
}

function adapt(raw: LooseTool): ToolDefinition {
  const slug = raw.slug;
  const category: CategorySlug =
    CATEGORY_BY_SLUG[slug] ?? CATEGORY_ALIASES[raw.category ?? ""] ?? "text-tools";
  const icon: IconName =
    ICON_BY_SLUG[slug] ??
    ((raw.icon && VALID_ICONS.has(raw.icon) ? raw.icon : "sparkles") as IconName);
  const maxFileMB = MAX_FILE_MB_BY_SLUG[slug] ?? raw.maxFileMB;
  const { intro, sections } = splitArticle(raw.article, raw.sections, raw.intro);
  const description = raw.description ?? raw.tagline ?? raw.name;
  const definition: ToolDefinition = {
    slug,
    name: raw.name,
    h1: raw.h1 ?? `Free ${raw.name} Online`,
    tagline: raw.tagline ?? description,
    metaTitle: deriveMetaTitle(raw.metaTitle ?? raw.seoTitle, raw.name),
    metaDescription: clipAtWord(
      raw.metaDescription ?? raw.seoDescription ?? description,
      160,
      true
    ),
    category,
    icon,
    keywords: raw.keywords ?? [],
    intro: intro || description,
    howTo: raw.howTo ?? HOW_TO_BY_SLUG[slug] ?? DEFAULT_HOW_TO,
    sections,
    faqs: toFaqs(raw.faqs),
    features: raw.features ?? featuresFor(maxFileMB),
    schemaType: "WebApplication",
    related: raw.related,
    datePublished: LEGAL_UPDATED_ISO,
    dateModified: LEGAL_UPDATED_ISO,
  };
  if (maxFileMB !== undefined) definition.maxFileMB = maxFileMB;
  return definition;
}

export const tools: ToolDefinition[] = RAW_TOOLS.map(adapt);

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
  limit = 3
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
  (tool.related ?? []).forEach((slug) => add(getToolBySlug(slug)));
  tools.filter((t) => t.category === tool.category).forEach(add);
  tools.forEach(add);
  return picked;
}

export function getActiveCategories(): CategoryWithCount[] {
  const result: CategoryWithCount[] = [];
  for (const slug of CATEGORY_ORDER) {
    const category = getCategory(slug);
    if (!category) continue;
    const count = getToolsByCategory(slug).length;
    if (count > 0) result.push({ ...category, count });
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
