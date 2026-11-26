export const ICON_NAMES = [
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
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export const CATEGORY_SLUGS = [
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
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export const SCHEMA_TYPES = ["WebApplication", "SoftwareApplication"] as const;

export type SchemaType = (typeof SCHEMA_TYPES)[number];

export interface FaqItem {
  q: string;
  a: string;
}

export interface ContentSection {
  heading: string;
  paragraphs: string[];
}

export interface Category {
  slug: CategorySlug;
  name: string;
  tagline: string;
  description: string;
  body: string[];
  icon: IconName;
  keywords: string[];
}

export interface ToolDefinition {
  slug: string;
  name: string;
  h1: string;
  tagline: string;
  metaTitle: string;
  metaDescription: string;
  category: CategorySlug;
  icon: IconName;
  keywords: string[];
  intro: string;
  howTo: string[];
  sections: ContentSection[];
  faqs: FaqItem[];
  features: string[];
  schemaType: SchemaType;
  maxFileMB?: number;
  related?: string[];
  datePublished: string;
  dateModified: string;
}

export interface ToolSummary {
  slug: string;
  name: string;
  tagline: string;
  category: CategorySlug;
  categoryName: string;
  icon: IconName;
  keywords: string[];
  maxFileMB?: number;
}

export interface Tool {
  slug: string;
  [key: string]: unknown;
}
