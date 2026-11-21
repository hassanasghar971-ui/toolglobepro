import type { Metadata } from "next";

/* -------------------------------------------------------------------------- */
/*  Site constants                                                            */
/* -------------------------------------------------------------------------- */

export const SITE_NAME = "ToolGlobe Pro";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://toolglobe.pro"
).replace(/\/+$/, "");

/** Change this single constant if tool pages are served from a different path. */
export const TOOLS_BASE_PATH = "/tools";

export const OWNER = {
  name: "Hassan Asghar",
  email: "hassanasghar7868686@gmail.com",
  whatsapp: [
    {
      label: "+92 345 1098607",
      e164: "+923451098607",
      url: "https://wa.me/923451098607",
    },
    {
      label: "+92 349 7726469",
      e164: "+923497726469",
      url: "https://wa.me/923497726469",
    },
  ],
} as const;

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type ToolCategory =
  | "developer"
  | "data"
  | "text"
  | "converter"
  | "security"
  | "image"
  | "seo"
  | "math";

export type ToolIconName =
  | "code"
  | "table"
  | "type"
  | "shield"
  | "image"
  | "arrows"
  | "search"
  | "calculator"
  | "markdown"
  | "link"
  | "braces"
  | "file-text"
  | "globe";

export type ChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export type ProcessingModel = "main-thread" | "worker";

export interface ToolFaq {
  readonly q: string;
  readonly a: string;
}

export interface ToolStep {
  readonly title: string;
  readonly text: string;
}

export interface ToolDefinition {
  /** URL slug. The component is `<PascalSlug>Tool`. */
  readonly slug: string;
  /** Short display name (cards, nav, breadcrumbs). */
  readonly name: string;
  /** SEO <title> (without site suffix). */
  readonly title: string;
  readonly tagline: string;
  /** Meta description (<= ~160 chars). */
  readonly description: string;
  readonly category: ToolCategory;
  readonly icon: ToolIconName;
  readonly keywords: readonly string[];
  readonly features: readonly string[];
  readonly howTo: readonly ToolStep[];
  readonly faqs: readonly ToolFaq[];
  /** Slugs of related tools (unknown slugs are ignored by helpers). */
  readonly related: readonly string[];
  /** Maximum input size the tool accepts, in megabytes. */
  readonly maxInputMB: number;
  readonly processing: ProcessingModel;
  readonly dateAdded: string;
  readonly dateModified: string;
  /** Sitemap priority 0..1 */
  readonly priority: number;
  readonly changeFrequency: ChangeFrequency;
  readonly featured: boolean;
}

export interface CategoryMeta {
  readonly slug: ToolCategory;
  readonly label: string;
  readonly description: string;
  readonly icon: ToolIconName;
  readonly order: number;
}

/* -------------------------------------------------------------------------- */
/*  Icon + category metadata                                                  */
/* -------------------------------------------------------------------------- */

/**
 * 24x24 stroke icons (stroke="currentColor", strokeWidth=2, round caps).
 * Render with an inline <svg> in any component; no Icon component required.
 */
export const TOOL_ICON_PATHS: Readonly<Record<ToolIconName, readonly string[]>> = {
  code: ["M16 18l6-6-6-6", "M8 6l-6 6 6 6"],
  table: ["M3 4h18v16H3z", "M3 10h18", "M3 15h18", "M9 4v16"],
  type: ["M4 7V4h16v3", "M9 20h6", "M12 4v16"],
  shield: ["M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"],
  image: [
    "M3 4h18v16H3z",
    "M8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
    "M21 16l-5-5-9 9",
  ],
  arrows: ["M4 8h14", "M14 4l4 4-4 4", "M20 16H6", "M10 12l-4 4 4 4"],
  search: ["M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z", "M21 21l-4.3-4.3"],
  calculator: [
    "M5 3h14v18H5z",
    "M8 7h8",
    "M8 12h.01",
    "M12 12h.01",
    "M16 12h.01",
    "M8 16h.01",
    "M12 16h.01",
    "M16 16h.01",
  ],
  markdown: ["M3 6h18v12H3z", "M7 15V9l2.5 3L12 9v6", "M16 9v6", "M14 13l2 2 2-2"],
  link: [
    "M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.43",
    "M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.33-1.33",
  ],
  braces: [
    "M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1",
    "M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1",
  ],
  "file-text": [
    "M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z",
    "M14 3v5h5",
    "M9 13h6",
    "M9 17h6",
  ],
  globe: [
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
    "M3 12h18",
    "M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z",
  ],
};

export const CATEGORY_META: Readonly<Record<ToolCategory, CategoryMeta>> = {
  developer: {
    slug: "developer",
    label: "Developer Tools",
    description:
      "Encoders, formatters and previewers for everyday development work, all running locally in your browser.",
    icon: "code",
    order: 1,
  },
  data: {
    slug: "data",
    label: "Data Tools",
    description:
      "Convert and clean structured data such as CSV and JSON without uploading a single byte.",
    icon: "table",
    order: 2,
  },
  text: {
    slug: "text",
    label: "Text & Writing",
    description:
      "Write, preview and transform text and Markdown with instant, private results.",
    icon: "type",
    order: 3,
  },
  converter: {
    slug: "converter",
    label: "Converters",
    description: "Convert between formats and units quickly and privately.",
    icon: "arrows",
    order: 4,
  },
  security: {
    slug: "security",
    label: "Security & Privacy",
    description: "Hashing, generators and privacy helpers that never leave your device.",
    icon: "shield",
    order: 5,
  },
  image: {
    slug: "image",
    label: "Image Tools",
    description: "Resize, compress and convert images using your own browser.",
    icon: "image",
    order: 6,
  },
  seo: {
    slug: "seo",
    label: "SEO Tools",
    description: "Meta tag, slug and structured-data helpers for better search visibility.",
    icon: "search",
    order: 7,
  },
  math: {
    slug: "math",
    label: "Math & Calculators",
    description: "Fast calculators and number utilities.",
    icon: "calculator",
    order: 8,
  },
};

/* -------------------------------------------------------------------------- */
/*  Tool registry                                                             */
/* -------------------------------------------------------------------------- */

const TOOL_LIST = [
  {
    slug: "markdown-previewer",
    name: "Markdown Previewer",
    title: "Markdown Previewer – Live Editor & HTML Export",
    tagline: "Write Markdown, see a safe live preview, export clean HTML.",
    description:
      "Free online Markdown previewer with live preview, GitHub-style tables, task lists and code blocks. Export HTML instantly. 100% private, runs in your browser.",
    category: "text",
    icon: "markdown",
    keywords: [
      "markdown previewer",
      "markdown editor online",
      "markdown to html",
      "live markdown preview",
      "github markdown preview",
      "markdown viewer",
      "markdown table preview",
    ],
    features: [
      "Live, sanitized preview with no raw HTML injection",
      "Headings, lists, task lists, quotes, code fences and GFM tables",
      "One-click copy or download of standalone HTML",
      "Heading outline with click-to-scroll navigation",
      "Word count and reading time",
      "Works offline once loaded; nothing is uploaded",
    ],
    howTo: [
      {
        title: "Type or paste Markdown",
        text: "Write in the editor or open a .md file from your device (up to 5 MB).",
      },
      {
        title: "Watch the live preview",
        text: "The preview updates as you type. Use the toolbar for bold, links, lists and more.",
      },
      {
        title: "Export your result",
        text: "Copy the generated HTML, download a standalone .html page, or save your Markdown file.",
      },
    ],
    faqs: [
      {
        q: "Is my Markdown uploaded to a server?",
        a: "No. Rendering happens entirely in your browser. Your text never leaves your device.",
      },
      {
        q: "Does the previewer allow raw HTML or scripts?",
        a: "No. All HTML in the source is escaped, and links and images are restricted to safe protocols, so the preview cannot run scripts.",
      },
      {
        q: "Which Markdown features are supported?",
        a: "Headings, emphasis, strikethrough, inline code, fenced and indented code blocks, block quotes, nested ordered, unordered and task lists, horizontal rules, links, images, autolinks and GitHub-style tables with column alignment.",
      },
      {
        q: "What is the maximum file size?",
        a: "Files up to 5 MB can be opened. Very large documents may render slowly because the preview runs on your device.",
      },
    ],
    related: ["url-encoder-decoder", "csv-to-json"],
    maxInputMB: 5,
    processing: "main-thread",
    dateAdded: "2025-01-15",
    dateModified: "2025-06-01",
    priority: 0.8,
    changeFrequency: "monthly",
    featured: true,
  },
  {
    slug: "csv-to-json",
    name: "CSV to JSON",
    title: "CSV to JSON Converter – Handles Files Up to 600 MB",
    tagline: "Stream-convert huge CSV files to JSON in a background thread.",
    description:
      "Convert CSV to JSON online with auto-detected delimiters, type inference and NDJSON output. Streams files up to 600 MB in your browser. Nothing is uploaded.",
    category: "data",
    icon: "table",
    keywords: [
      "csv to json",
      "csv to json converter",
      "convert csv to json online",
      "large csv to json",
      "csv to ndjson",
      "tsv to json",
      "csv parser online",
    ],
    features: [
      "Streaming parser: converts files up to 600 MB without freezing the page",
      "Auto-detects comma, semicolon, tab and pipe delimiters",
      "Array of objects, array of arrays, or NDJSON (JSON Lines) output",
      "Optional number, boolean and null type inference",
      "RFC 4180 quoting, embedded newlines and BOM handling",
      "Progress bar, cancel button and instant download",
    ],
    howTo: [
      {
        title: "Add your CSV",
        text: "Paste CSV text or drop a .csv, .tsv or .txt file (up to 600 MB).",
      },
      {
        title: "Choose options",
        text: "Pick delimiter, header handling, output format and whether to infer numbers and booleans.",
      },
      {
        title: "Convert and download",
        text: "Press Convert. A background worker streams the file; then preview, copy or download the JSON.",
      },
    ],
    faqs: [
      {
        q: "Is my CSV file uploaded anywhere?",
        a: "No. The file is read and converted inside a Web Worker in your browser. There is no server involved.",
      },
      {
        q: "How can it handle a 600 MB file?",
        a: "The file is read in 8 MB slices and converted incrementally, and the JSON output is assembled as disk-backed Blob chunks, so the whole file is never held as a single string.",
      },
      {
        q: "Which output formats are available?",
        a: "An array of objects keyed by header names, an array of arrays, or NDJSON with one object per line, which is best for very large datasets.",
      },
      {
        q: "What happens with duplicate or empty headers?",
        a: "Empty headers become column_N and duplicates get a numeric suffix (name_2, name_3) so no data is overwritten.",
      },
      {
        q: "Why is the Copy button disabled for big results?",
        a: "Copying more than 5 MB to the clipboard is unreliable in browsers. Use the Download button for large outputs.",
      },
    ],
    related: ["url-encoder-decoder", "markdown-previewer"],
    maxInputMB: 600,
    processing: "worker",
    dateAdded: "2025-01-15",
    dateModified: "2025-06-01",
    priority: 0.9,
    changeFrequency: "monthly",
    featured: true,
  },
  {
    slug: "url-encoder-decoder",
    name: "URL Encoder / Decoder",
    title: "URL Encoder & Decoder – Percent-Encode Online",
    tagline: "Encode, decode, parse and build URLs and query strings.",
    description:
      "Free URL encoder and decoder with component, full-URI, form (+) and encode-all modes. Parse URLs, inspect query parameters and build query strings privately.",
    category: "developer",
    icon: "link",
    keywords: [
      "url encoder",
      "url decoder",
      "percent encoding",
      "urlencode online",
      "encodeURIComponent online",
      "decode url online",
      "query string builder",
      "url parser",
    ],
    features: [
      "Component, full URI, form-urlencoded (+) and encode-everything modes",
      "Strict RFC 3986 option and keep-existing-%XX option",
      "Lenient decoding that survives malformed UTF-8 sequences",
      "Per-line mode for bulk URL lists and repeat-decode for double-encoded text",
      "URL parser with decoded query parameter table",
      "Query string builder from key=value lines; files up to 50 MB",
    ],
    howTo: [
      {
        title: "Choose a direction",
        text: "Select Encode or Decode, then pick the mode that matches your use case.",
      },
      {
        title: "Paste text or open a file",
        text: "Results update live for normal inputs. For very large inputs press Convert.",
      },
      {
        title: "Copy, swap or download",
        text: "Copy the result, swap it back into the input, or download it as a text file.",
      },
    ],
    faqs: [
      {
        q: "What is the difference between component and full URI encoding?",
        a: "Component mode (encodeURIComponent) escapes reserved characters such as / ? & = # and is right for parameter values. Full URI mode (encodeURI) keeps those characters so a complete URL stays valid.",
      },
      {
        q: "When should I use form mode?",
        a: "Use form mode for application/x-www-form-urlencoded data, where spaces are written as + instead of %20.",
      },
      {
        q: "Why do I see replacement characters when decoding?",
        a: "The input contained percent sequences that are not valid UTF-8. The tool decodes leniently and reports how many bytes were replaced instead of failing.",
      },
      {
        q: "Is my data sent to a server?",
        a: "No. All encoding and decoding runs locally in your browser.",
      },
    ],
    related: ["csv-to-json", "markdown-previewer"],
    maxInputMB: 50,
    processing: "main-thread",
    dateAdded: "2025-01-15",
    dateModified: "2025-06-01",
    priority: 0.8,
    changeFrequency: "monthly",
    featured: false,
  },
] as const satisfies readonly ToolDefinition[];

export type ToolSlug = (typeof TOOL_LIST)[number]["slug"];

export const TOOLS: readonly ToolDefinition[] = TOOL_LIST;

const TOOL_BY_SLUG: ReadonlyMap<string, ToolDefinition> = new Map(
  TOOLS.map((tool) => [tool.slug, tool] as const),
);

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

export function toPascalSlug(slug: string): string {
  return slug
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** `csv-to-json` -> `CsvToJsonTool` */
export function getToolComponentName(slug: string): string {
  return `${toPascalSlug(slug)}Tool`;
}

export function isToolSlug(value: string): value is ToolSlug {
  return TOOL_BY_SLUG.has(value);
}

export function getAllTools(): readonly ToolDefinition[] {
  return TOOLS;
}

export function getAllToolSlugs(): ToolSlug[] {
  return TOOL_LIST.map((tool) => tool.slug);
}

/** For `generateStaticParams` in `app/tools/[slug]/page.tsx`. */
export function getToolStaticParams(): { slug: string }[] {
  return TOOLS.map((tool) => ({ slug: tool.slug }));
}

export function getToolBySlug(slug: string): ToolDefinition | undefined {
  return TOOL_BY_SLUG.get(slug);
}

export function getToolsByCategory(category: ToolCategory): ToolDefinition[] {
  return TOOLS.filter((tool) => tool.category === category);
}

export function getFeaturedTools(limit = 6): ToolDefinition[] {
  return TOOLS.filter((tool) => tool.featured).slice(0, limit);
}

export function getRelatedTools(slug: string, limit = 4): ToolDefinition[] {
  const tool = TOOL_BY_SLUG.get(slug);
  if (!tool) return [];
  const explicit = tool.related
    .map((related) => TOOL_BY_SLUG.get(related))
    .filter((value): value is ToolDefinition => value !== undefined && value.slug !== slug);
  if (explicit.length >= limit) return explicit.slice(0, limit);
  const fillers = TOOLS.filter(
    (candidate) =>
      candidate.slug !== slug &&
      candidate.category === tool.category &&
      !explicit.some((e) => e.slug === candidate.slug),
  );
  return [...explicit, ...fillers].slice(0, limit);
}

/** Categories that currently contain at least one tool, ordered for display. */
export function getActiveCategories(): CategoryMeta[] {
  const used = new Set<ToolCategory>(TOOLS.map((tool) => tool.category));
  return Object.values(CATEGORY_META)
    .filter((meta) => used.has(meta.slug))
    .sort((a, b) => a.order - b.order);
}

export function searchTools(query: string): ToolDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...TOOLS];
  const terms = q.split(/\s+/);
  return TOOLS.filter((tool) => {
    const haystack = [tool.name, tool.title, tool.tagline, tool.description, tool.category, ...tool.keywords]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

export function getToolPath(slug: string): string {
  return `${TOOLS_BASE_PATH}/${slug}`;
}

export function getToolUrl(slug: string): string {
  return `${SITE_URL}${getToolPath(slug)}`;
}

export function formatToolLimit(tool: ToolDefinition): string {
  return tool.maxInputMB >= 1024
    ? `${(tool.maxInputMB / 1024).toFixed(1)} GB` : `${tool.maxInputMB} MB`;
}

/** Entries ready for `app/sitemap.ts` (tool pages only). */
export function getToolSitemapEntries(): {
  url: string;
  lastModified: Date;
  changeFrequency: ChangeFrequency;
  priority: number;
}[] {
  return TOOLS.map((tool) => ({
    url: getToolUrl(tool.slug),
    lastModified: new Date(tool.dateModified),
    changeFrequency: tool.changeFrequency,
    priority: tool.priority,
  }));
}

/* -------------------------------------------------------------------------- */
/*  SEO helpers (always indexable)                                            */
/* -------------------------------------------------------------------------- */

export function getToolMetadata(slug: string): Metadata {
  const tool = TOOL_BY_SLUG.get(slug);
  if (!tool) {
    return { title: { absolute: `Tool not found | ${SITE_NAME}` } }; } const url = getToolUrl(tool.slug); const fullTitle = `${tool.title} | ${SITE_NAME}`; return { title: { absolute: fullTitle }, description: tool.description, keywords: [...tool.keywords], alternates: { canonical: url }, authors: [{ name: OWNER.name }], creator: OWNER.name, publisher: SITE_NAME, robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1, }, }, openGraph: { type: "website", url, siteName: SITE_NAME, title: fullTitle, description: tool.description, locale: "en_US", }, twitter: { card: "summary_large_image", title: fullTitle, description: tool.description, }, }; }  export function getToolJsonLd(slug: string): Record<string, unknown> \vert{} null { const tool = TOOL_BY_SLUG.get(slug); if (!tool) return null; const url = getToolUrl(tool.slug); const category = CATEGORY_META[tool.category];  return { "@context": "https://schema.org", "@graph": [ { "@type": "SoftwareApplication", "@id": `${url}#app`,
        name: tool.name,
        description: tool.description,
        url,
        applicationCategory:
          tool.category === "developer" ? "DeveloperApplication" : "UtilitiesApplication",
        operatingSystem: "Any (web browser)",
        browserRequirements: "Requires JavaScript",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        datePublished: tool.dateAdded,
        dateModified: tool.dateModified,
        featureList: [...tool.features],
        author: {
          "@type": "Person",
          name: OWNER.name,
          email: OWNER.email,
        },
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      },
      {
        "@type": "FAQPage",
        "@id": `${url}#faq`, mainEntity: tool.faqs.map((faq) => ({ "@type": "Question", name: faq.q, acceptedAnswer: { "@type": "Answer", text: faq.a }, })), }, { "@type": "HowTo", "@id": `${url}#howto`,
        name: `How to use ${tool.name}`,
        step: tool.howTo.map((step, index) => ({
          "@type": "HowToStep",
          position: index + 1,
          name: step.title,
          text: step.text,
        })),
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${url}#breadcrumbs`, itemListElement: [ { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL }, { "@type": "ListItem", position: 2, name: category.label, item: `${SITE_URL}${TOOLS_BASE_PATH}`, }, { "@type": "ListItem", position: 3, name: tool.name, item: url }, ], }, ], }; } ```  ---  ### 2. `components/tools/tool-map.tsx`  ```tsx "use client";  import dynamic from "next/dynamic"; import type { ComponentType } from "react"; import type { ToolSlug } from "@/lib/tools";  /** * Maps every registered tool slug to its `<PascalSlug>Tool` component. * * - Components are code-split with next/dynamic but still server-rendered *   (no `ssr: false`), so tool pages stay fully indexable. * - `Record<ToolSlug, …>` makes a missing mapping a compile-time error. */  function ToolSkeleton() { return ( <div className="card" aria-busy="true" aria-live="polite"> <div className="h-6 w-1/3 animate-pulse rounded bg-current opacity-10" /> <div className="mt-4 h-40 w-full animate-pulse rounded bg-current opacity-10" /> <div className="mt-4 h-10 w-32 animate-pulse rounded bg-current opacity-10" /> <span className="sr-only">Loading tool…</span> </div> ); }  const MarkdownPreviewerTool = dynamic( () => import("./markdown-previewer/MarkdownPreviewerTool").then( (mod) => mod.MarkdownPreviewerTool, ), { loading: () => <ToolSkeleton /> }, );  const CsvToJsonTool = dynamic( () => import("./csv-to-json/CsvToJsonTool").then((mod) => mod.CsvToJsonTool), { loading: () => <ToolSkeleton /> }, );  const UrlEncoderDecoderTool = dynamic( () => import("./url-encoder-decoder/UrlEncoderDecoderTool").then( (mod) => mod.UrlEncoderDecoderTool, ), { loading: () => <ToolSkeleton /> }, );  export const TOOL_COMPONENTS: Record<ToolSlug, ComponentType> = { "markdown-previewer": MarkdownPreviewerTool, "csv-to-json": CsvToJsonTool, "url-encoder-decoder": UrlEncoderDecoderTool, };  export function getToolComponent(slug: string): ComponentType \vert{} null { return Object.prototype.hasOwnProperty.call(TOOL_COMPONENTS, slug) ? TOOL_COMPONENTS[slug as ToolSlug] : null; }  /** Use from a Server Component page: `<ToolRenderer slug={tool.slug} />`. */ export function ToolRenderer({ slug }: { slug: string }) { const Component = getToolComponent(slug); if (!Component) return null; return <Component />; } ```  ---  ### 3. `components/tools/markdown-previewer/markdown.ts`  ```ts /** * Dependency-free, XSS-safe Markdown renderer. * - All raw HTML in the source is escaped (never passed through). * - Link / image URLs are restricted to safe protocols. */  export interface MarkdownHeading { level: number; text: string; id: string; }  export interface MarkdownOptions { /** Prefix for generated heading ids (avoids DOM id collisions in-page). */ idPrefix?: string; }  export interface MarkdownResult { html: string; headings: MarkdownHeading[]; words: number; characters: number; readingMinutes: number; }  interface Ctx { headings: MarkdownHeading[]; ids: Map<string, number>; prefix: string; }  const MAX_DEPTH = 16;  const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;", };  export function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, (ch) => ESCAPES[ch] ?? ch); }  function decodeEntities(value: string): string { return value .replace(/&lt;/g, "<") .replace(/&gt;/g, ">") .replace(/&quot;/g, '"') .replace(/&#39;/g, "'") .replace(/&amp;/g, "&"); }  function slugify(text: string): string { const base = text .toLowerCase() .normalize("NFKD") .replace(/[\u0300-\u036f]/g, "") .replace(/[^\p{L}\p{N}\s-]/gu, "") .trim() .replace(/\s+/g, "-") .replace(/-+/g, "-"); return base \vert{}\vert{} "section"; }  function sanitizeUrl(raw: string, image: boolean): string \vert{} null { const url = raw.trim(); if (!url) return null; // eslint-disable-next-line no-control-regex const compact = url.replace(/[\u0000-\u0020\u007f-\u009f]/g, "").toLowerCase(); const scheme = /^([a-z][a-z0-9+.-]*):/.exec(compact); if (!scheme) return url; // relative URL, fragment or protocol-relative const name = scheme[1]; if (name === "http" \vert{}\vert{} name === "https" \vert{}\vert{} name === "mailto" \vert{}\vert{} name === "tel") { return url; } if (image && /^data:image\/(?:png\vert{}jpe?g\vert{}gif\vert{}webp\vert{}avif);base64,[a-z0-9+/=]+$/i.test(compact)) { return url; } return null; }  /* -------------------------------------------------------------------------- */ /*  Inline rendering                                                          */ /* -------------------------------------------------------------------------- */  function format(text: string): string { return text .replace(/\*\*\*(?=\S)([\s\S]*?\S)\*\*\*/g, "<strong><em>$1</em></strong>") .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>") .replace(/(^\vert{}[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, "$1<strong>$2</strong>") .replace(/\*(?=\S)([^*]*?\S)\*/g, "<em>$1</em>") .replace(/(^\vert{}[^\w])_(?=\S)([^_]*?\S)_(?!\w)/g, "$1<em>$2</em>") .replace(/~~(?=\S)([\s\S]*?\S)~~/g, "<del>$1</del>"); }  function renderInline(source: string): string { const stash: string[] = []; const hold = (html: string): string => `\u0000${stash.push(html) - 1}\u0000`;
  const restore = (value: string): string =>
    value.replace(/\u0000(\d+)\u0000/g, (_m, index: string) => stash[Number(index)] ?? "");

  let text = source;

  // Code spans
  text = text.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_m, _ticks: string, code: string) => {
    const cleaned = code.replace(/\n/g, " ").replace(/^ (.*) $/, "$1");
    return hold(`<code>${escapeHtml(cleaned)}</code>`);
  });

  // Hard line breaks
  text = text.replace(/(?: {2,}|\\)\n/g, () => hold("<br />\n"));

  // Backslash escapes
  text = text.replace(/\\([\\`*_{}[\]()#+\-.!|~<>&"'])/g, (_m, ch: string) => hold(escapeHtml(ch)));

  // Escape everything else
  text = escapeHtml(text);

  // Images
  text = text.replace(
    /!\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+&quot;(.*?)&quot;)?\s*\)/g,
    (_m, alt: string, url: string, title?: string) => {
      const plainAlt = restore(alt).replace(/<[^>]*>/g, "");
      const src = sanitizeUrl(url, true);
      if (!src) return plainAlt;
      return hold(
        `<img src="${src}" alt="${plainAlt}"${title ? ` title="${title}"` : ""} loading="lazy" decoding="async" referrerpolicy="no-referrer" />`,
      );
    },
  );

  // Links
  text = text.replace(
    /\[([^\]]+)\]\(\s*([^\s)]+)(?:\s+&quot;(.*?)&quot;)?\s*\)/g,
    (_m, label: string, url: string, title?: string) => {
      const href = sanitizeUrl(url, false);
      if (!href) return label;
      const external = href.startsWith("#") ? "" : ' target="_blank" rel="noopener noreferrer nofollow ugc"';
      return hold(
        `<a href="${href}"${title ? ` title="${title}"` : ""}${external}>${restore(format(label))}</a>`,
      );
    },
  );

  // <https://…> and <mail@x.y> autolinks
  text = text.replace(
    /&lt;((?:https?:\/\/|mailto:)(?:(?!&gt;)\S)+)&gt;/g,
    (_m, url: string) =>
      hold(`<a href="${url}" target="_blank" rel="noopener noreferrer nofollow ugc">${url}</a>`),
  );
  text = text.replace(
    /&lt;([^\s@&]+@[^\s@&]+\.[^\s@&]+)&gt;/g,
    (_m, mail: string) => hold(`<a href="mailto:${mail}">${mail}</a>`), );  // Bare URLs text = text.replace( /(^\vert{}[\s(])(https?:\/\/[^\s\u0000]+?)(?=[.,;:!?)\]]*(?:&quot;\vert{}&lt;\vert{}&gt;\vert{}\s\vert{}\u0000\vert{}$))/g, (_m, lead: string, url: string) => `${lead}${hold(`<a href="${url}" target="_blank" rel="noopener noreferrer nofollow ugc">${url}</a>`)}`, );  text = format(text); return restore(text); }  /* -------------------------------------------------------------------------- */ /*  Block rendering                                                           */ /* -------------------------------------------------------------------------- */  const FENCE_RE = /^ {0,3}(?:(`{3,})\s*([^\s`]*)[^`]*\vert{}(~{3,})\s*(\S*).*)$/;
const ATX_RE = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const HR_RE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const QUOTE_RE = /^ {0,3}>/;
const LIST_RE = /^( {0,3})([*+-]|\d{1,9}[.)])( +|$)(.*)$/;
const LIST_INTERRUPT_RE = /^ {0,3}(?:[*+-]|1[.)])[ \t]+\S/;
const SETEXT_RE = /^ {0,3}(=+|-+)[ \t]*$/;
const TABLE_DELIM_RE = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;

function indentOf(line: string): number {
  return line.length - line.trimStart().length;
}

function isBlockStart(line: string): boolean {
  return (
    FENCE_RE.test(line) ||
    ATX_RE.test(line) ||
    HR_RE.test(line) ||
    QUOTE_RE.test(line) ||
    LIST_INTERRUPT_RE.test(line)
  );
}

function splitRow(line: string): string[] {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells: string[] = [];
  let current = "";
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\" && s[i + 1] === "|") {
      current += "|";
      i++;
    } else if (ch === "|") {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

function makeHeading(level: number, raw: string, ctx: Ctx): string {
  const inner = renderInline(raw.trim());
  const text = decodeEntities(inner.replace(/<[^>]*>/g, "")).trim();
  const base = slugify(text);
  const seen = ctx.ids.get(base) ?? 0;
  ctx.ids.set(base, seen + 1);
  const id = ctx.prefix + (seen === 0 ? base : `${base}-${seen}`);
  ctx.headings.push({ level, text, id });
  return `<h${level} id="${escapeHtml(id)}">${inner}</h${level}>\n`;
}

function parseList(
  lines: string[],
  start: number,
  ctx: Ctx,
  depth: number,
): { html: string; next: number } {
  const first = LIST_RE.exec(lines[start]) as RegExpExecArray;
  const ordered = /\d/.test(first[2]);
  const delimiter = ordered ? first[2].slice(-1) : first[2];
  const startNumber = ordered ? parseInt(first[2], 10) : 1;
  const items: string[][] = [];
  const n = lines.length;
  let loose = false;
  let i = start;

  const sameKind = (m: RegExpExecArray): boolean =>
    /\d/.test(m[2]) === ordered && (ordered ? m[2].slice(-1) : m[2]) === delimiter;

  while (i < n) {
    const m = LIST_RE.exec(lines[i]);
    if (!m || !sameKind(m) || HR_RE.test(lines[i])) break;

    const spaces = m[3].length;
    const contentIndent = m[1].length + m[2].length + (spaces === 0 || spaces > 4 ? 1 : spaces);
    const item: string[] = [m[4]];
    i++;

    while (i < n) {
      const l = lines[i];
      if (l.trim() === "") {
        let k = i + 1;
        while (k < n && lines[k].trim() === "") k++;
        if (k < n && indentOf(lines[k]) >= contentIndent) {
          for (let b = i; b < k; b++) item.push("");
          i = k;
          loose = true;
          continue;
        }
        break;
      }
      if (indentOf(l) >= contentIndent) {
        item.push(l.slice(contentIndent));
        i++;
        continue;
      }
      const last = item[item.length - 1];
      if (last.trim() !== "" && !LIST_RE.test(l) && !isBlockStart(l)) {
        item.push(l.trimStart());
        i++;
        continue;
      }
      break;
    }

    items.push(item);

    let k = i;
    while (k < n && lines[k].trim() === "") k++;
    if (k > i) {
      if (k < n) {
        const next = LIST_RE.exec(lines[k]);
        if (next && sameKind(next) && !HR_RE.test(lines[k])) {
          loose = true;
          i = k;
          continue;
        }
      }
      break;
    }
  }

  const body = items
    .map((item) => {
      let firstLine = item[0];
      let prefix = "";
      let cls = "";
      const task = /^\[( \vert{}x\vert{}X)\][ \t]+/.exec(firstLine);
      if (task) {
        prefix = `<input type="checkbox" disabled${task[1] === " " ? "" : " checked"} /> `;
        firstLine = firstLine.slice(task[0].length);
        cls = ' class="md-task"';
      }
      const content = renderBlocks([firstLine, ...item.slice(1)], !loose, ctx, depth + 1).replace(
        /\n+$/,
        "",
      );
      return `<li${cls}>${prefix}${content}</li>`;
    })
    .join("\n");

  const html = ordered
    ? `<ol${startNumber !== 1 ? ` start="${startNumber}"` : ""}>\n${body}\n</ol>\n`
    : `<ul>\n${body}\n</ul>\n`;

  return { html, next: i };
}

function renderBlocks(lines: string[], tight: boolean, ctx: Ctx, depth: number): string {
  if (depth > MAX_DEPTH) {
    return `<pre><code>${escapeHtml(lines.join("\n"))}</code></pre>\n`;
  }

  const out: string[] = [];
  const n = lines.length;
  let i = 0;

  while (i < n) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    // Fenced code
    const fence = FENCE_RE.exec(line);
    if (fence) {
      const marker = fence[1] ?? fence[3] ?? "```";
      const lang = (fence[2] ?? fence[4] ?? "").replace(/[^\w+#.-]/g, "");
      const indent = indentOf(line);
      const body: string[] = [];
      i++;
      while (i < n) {
        const t = lines[i].trim();
        if (
          t.length >= marker.length &&
          t[0] === marker[0] &&
          /^(?:`{3,}|~{3,})$/.test(t)
        ) {
          break;
        }
        let k = 0;
        while (k < indent && lines[i][k] === " ") k++;
        body.push(lines[i].slice(k));
        i++;
      }
      if (i < n) i++; // closing fence
      out.push(
        `<pre><code${lang ? ` class="language-${lang}"` : ""}>${escapeHtml(body.join("\n"))}</code></pre>\n`,
      );
      continue;
    }

    // ATX heading
    const atx = ATX_RE.exec(line);
    if (atx) {
      out.push(makeHeading(atx[1].length, atx[2] ?? "", ctx));
      i++;
      continue;
    }

    // Horizontal rule
    if (HR_RE.test(line)) {
      out.push("<hr />\n");
      i++;
      continue;
    }

    // Blockquote
    if (QUOTE_RE.test(line)) {
      const buf: string[] = [];
      while (i < n) {
        const l = lines[i];
        if (QUOTE_RE.test(l)) {
          buf.push(l.replace(/^ {0,3}> ?/, ""));
        } else if (
          l.trim() !== "" &&
          !isBlockStart(l) &&
          buf.length > 0 &&
          buf[buf.length - 1].trim() !== ""
        ) {
          buf.push(l);
        } else {
          break;
        }
        i++;
      }
      out.push(`<blockquote>\n${renderBlocks(buf, false, ctx, depth + 1)}</blockquote>\n`);
      continue;
    }

    // Lists
    if (LIST_RE.test(line)) {
      const list = parseList(lines, i, ctx, depth);
      out.push(list.html);
      i = list.next;
      continue;
    }

    // Indented code
    if (/^ {4,}\S/.test(line)) {
      const buf: string[] = [];
      while (i < n && (/^ {4}/.test(lines[i]) || lines[i].trim() === "")) {
        buf.push(lines[i].slice(4));
        i++;
      }
      while (buf.length > 0 && buf[buf.length - 1].trim() === "") buf.pop();
      out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>\n`);
      continue;
    }

    // Table
    if (line.includes("|") && i + 1 < n && TABLE_DELIM_RE.test(lines[i + 1])) {
      const head = splitRow(line);
      const delim = splitRow(lines[i + 1]);
      if (head.length === delim.length) {
        const aligns = delim.map((cell) => {
          const left = cell.startsWith(":");
          const right = cell.endsWith(":");
          if (left && right) return "center";
          if (right) return "right";
          if (left) return "left";
          return "";
        });
        const cellHtml = (tag: string, value: string, col: number): string => {
          const align = aligns[col];
          return `<${tag}${align ? ` style="text-align:${align}"` : ""}>${renderInline(value)}</${tag}>`;
        };
        const rows: string[] = [];
        i += 2;
        while (i < n && lines[i].trim() !== "" && !isBlockStart(lines[i])) {
          const cells = splitRow(lines[i]);
          const cols: string[] = [];
          for (let c = 0; c < head.length; c++) cols.push(cellHtml("td", cells[c] ?? "", c));
          rows.push(`<tr>${cols.join("")}</tr>`);
          i++;
        }
        out.push(
          `<div class="md-table-wrap"><table>\n<thead><tr>${head
            .map((cell, c) => cellHtml("th", cell, c))
            .join("")}</tr></thead>\n<tbody>\n${rows.join("\n")}\n</tbody>\n</table></div>\n`,
        );
        continue;
      }
    }

    // Paragraph (with setext heading detection)
    const buf: string[] = [line];
    i++;
    let setextLevel = 0;
    while (i < n) {
      const l = lines[i];
      if (l.trim() === "") break;
      const setext = SETEXT_RE.exec(l);
      if (setext) {
        setextLevel = setext[1][0] === "=" ? 1 : 2;
        i++;
        break;
      }
      if (isBlockStart(l)) break;
      buf.push(l);
      i++;
    }
    const paragraph = buf
      .map((l, index) => (index === buf.length - 1 ? l.trim() : l.trimStart()))
      .join("\n");
    if (setextLevel > 0) {
      out.push(makeHeading(setextLevel, paragraph, ctx));
    } else if (tight) {
      out.push(`${renderInline(paragraph)}\n`);
    } else {
      out.push(`<p>${renderInline(paragraph)}</p>\n`);
    }
  }

  return out.join("");
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export function renderMarkdown(source: string, options: MarkdownOptions = {}): MarkdownResult {
  const clean = source
    .replace(/\u0000/g, "")
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, "    ");

  const ctx: Ctx = {
    headings: [],
    ids: new Map(),
    prefix: options.idPrefix ?? "",
  };

  const html = renderBlocks(clean.split("\n"), false, ctx, 0);
  const words = (clean.match(/\S+/g) ?? []).length;

  return {
    html,
    headings: ctx.headings,
    words,
    characters: clean.length,
    readingMinutes: words === 0 ? 0 : Math.max(1, Math.ceil(words / 220)),
  };
}
