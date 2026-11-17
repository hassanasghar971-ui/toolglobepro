export type IconName =
  | "search"
  | "sun"
  | "moon"
  | "menu"
  | "x"
  | "chevron-down"
  | "chevron-right"
  | "arrow-right"
  | "type"
  | "code"
  | "shield"
  | "globe"
  | "link"
  | "key"
  | "braces"
  | "file-text"
  | "upload"
  | "download"
  | "copy"
  | "check"
  | "alert"
  | "mail"
  | "message"
  | "home"
  | "sparkles"
  | "zap"
  | "lock"
  | "clock"
  | "hash"
  | "refresh"
  | "trash"
  | "map-pin"
  | "external"
  | "eye"
  | "trending-up"
  | "info";

export type CategorySlug =
  | "text-tools"
  | "developer-tools"
  | "security-tools"
  | "network-tools"
  | "seo-tools";

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
  /** Meta description (<= 160 chars). */
  description: string;
  /** Longer on-page copy, one string per paragraph. */
  body: string[];
  icon: IconName;
  keywords: string[];
}

export interface ToolDefinition {
  slug: string;
  name: string;
  /** On-page H1 (keyword-rich). */
  h1: string;
  tagline: string;
  /** <= 44 chars so that the "| ToolGlobe Pro" suffix keeps titles near 60. */
  metaTitle: string;
  /** <= 160 chars. */
  metaDescription: string;
  category: CategorySlug;
  icon: IconName;
  keywords: string[];
  /** Opening paragraph of the article (shown under the tool). */
  intro: string;
  howTo: string[];
  /** 500–800 words of human-written copy across all sections combined. */
  sections: ContentSection[];
  faqs: FaqItem[];
  /** Bullet features for schema.org featureList. */
  features: string[];
  schemaType: "WebApplication" | "SoftwareApplication";
  /** Set for tools that process files; shows a badge. */
  maxFileMB?: number;
  /** Slugs of related tools. */
  related?: string[];
  datePublished: string;
  dateModified: string;
}

/** Lightweight tool data safe to ship to client components. */
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

/** Legacy FAQ shape used by the per-tool files in lib/tools/*.ts. */
export interface LegacyFaq {
  question: string;
  answer: string;
}

/**
 * Authoring shape used by the per-tool files in lib/tools/*.ts.
 * lib/tools/index.ts converts every `Tool` into a full `ToolDefinition`.
 */
export interface Tool {
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  keywords: string[];
  seoTitle: string;
  seoDescription: string;
  article: ContentSection[];
  faqs: LegacyFaq[];
  maxFileMB?: number;
  related?: string[];
}
