import type { Category, CategorySlug } from "./types";

export const CATEGORIES: Category[] = [
  {
    slug: "text-tools",
    name: "Text Tools",
    tagline: "Fast browser-based text utilities for writing, formatting and analysis.",
    description: "Free online text tools that run locally in your browser to count words, convert case, compare text and clean strings without uploading data.",
    body: [
      "Process text directly in your browser with instant results and zero server uploads.",
      "Built for writers, editors, developers and students working with everyday copy and structured text.",
    ],
    icon: "type",
    keywords: ["text tools", "online text utilities", "browser text tools", "free text editor tools"],
  },
  {
    slug: "developer-tools",
    name: "Developer Tools",
    tagline: "Client-side utilities for formatting, inspecting and debugging code and payloads.",
    description: "Browser-based developer tools for formatting JSON, inspecting payloads and streamlining technical workflows with zero server storage.",
    body: [
      "Keep sensitive payloads, tokens and snippets local to your machine while formatting and inspecting them.",
      "Designed for fast keyboard-friendly workflows across desktop and mobile browsers.",
    ],
    icon: "code",
    keywords: ["developer tools", "online dev utilities", "json formatter", "browser developer tools"],
  },
  {
    slug: "security-tools",
    name: "Security Tools",
    tagline: "Local generators and cryptographic helpers that never transmit secrets.",
    description: "Client-side security tools including strong password generation and hash computation directly inside your browser.",
    body: [
      "Generate high-entropy credentials and compute hashes locally so secrets never touch a remote server.",
      "Ideal for security-conscious teams and individuals seeking fast browser-native helpers.",
    ],
    icon: "shield",
    keywords: ["security tools", "password generator", "hash generator", "client side security"],
  },
  {
    slug: "network-tools",
    name: "Network Tools",
    tagline: "Practical web and network diagnostics and URL utilities.",
    description: "Online network and URL utilities for checking IP details and working with web addresses quickly in your browser.",
    body: [
      "Inspect connection context and parse or format URLs without installing heavy desktop utilities.",
      "Built for clear outputs and rapid troubleshooting.",
    ],
    icon: "globe",
    keywords: ["network tools", "ip lookup", "url tools", "online network utilities"],
  },
  {
    slug: "seo-tools",
    name: "SEO Tools",
    tagline: "Slug builders and on-page optimization helpers for clean URLs and metadata.",
    description: "Browser-based SEO helpers for creating clean URL slugs and improving on-page structure for search engines.",
    body: [
      "Turn titles and phrases into clean, readable slugs with predictable rules.",
      "Supports fast content publishing workflows with zero server round-trips.",
    ],
    icon: "trending-up",
    keywords: ["seo tools", "slug generator", "url slug maker", "on page seo tools"],
  },
  {
    slug: "data-tools",
    name: "Data Tools",
    tagline: "Transform and inspect structured datasets like CSV and JSON locally.",
    description: "Client-side data tools to convert CSV to JSON and structure tabular data cleanly in the browser.",
    body: [
      "Convert structured datasets locally without uploading business or analytical spreadsheets to external servers.",
      "Supports large browser processing workflows with clean output formatting.",
      "Today that means turning CSV exports into clean JSON with delimiter detection, header handling and streamed processing for big files, so a spreadsheet from a client or a database dump never has to leave your machine.",
    ],
    icon: "braces",
    keywords: ["data tools", "csv to json", "json converter", "structured data tools"],
  },
  {
    slug: "file-tools",
    name: "File Tools",
    tagline: "Browser-native file helpers designed for speed and large-file safety.",
    description: "Client-side file tools with worker and stream support to handle files locally with clear size limits.",
    body: [
      "Work with local files directly through modern browser APIs without waiting on server uploads.",
      "Built with explicit resource cleanup to keep memory usage predictable.",
      "Every tool in this group follows the same rules: local processing, a stated size ceiling, a visible progress bar and a cancel button, so a large file never freezes the page.",
    ],
    icon: "upload",
    keywords: ["file tools", "online file utilities", "browser file processor", "large file tools"],
  },
  {
    slug: "converters",
    name: "Converters",
    tagline: "Quick format and value conversions right inside your browser.",
    description: "Fast online converters for transforming formats and values locally with immediate copy and download options.",
    body: [
      "Switch between formats cleanly without installing extra software or uploading sensitive inputs.",
      "Focused on accuracy, speed and straightforward controls.",
      "Each converter shows its result straight away, with one-click copy and download, so you can go from input to a usable output without leaving the page.",
    ],
    icon: "refresh",
    keywords: ["online converters", "format converter", "browser converters", "free conversion tools"],
  },
  {
    slug: "encoding-decoding-tools",
    name: "Encoding and Decoding Tools",
    tagline: "Encode and decode URLs and text representations safely in the browser.",
    description: "Client-side encoding and decoding tools including URL encoding and decoding for safe query strings and links.",
    body: [
      "Encode special characters and decode percent-encoded strings instantaneously in your browser.",
      "Useful for debugging APIs, query parameters, redirects and web links.",
      "The URL encoder and decoder covers component, full-URI and form encoding, warns about text that looks double-encoded, and can break a full URL into its parts and query parameters, which makes broken redirects and tracking links much easier to trace.",
    ],
    icon: "link",
    keywords: ["url encoder decoder", "encode decode online", "percent encoding", "url encoding tool"],
  },
  {
    slug: "image-tools",
    name: "Image Tools",
    tagline: "Compress and optimize images locally with zero server upload.",
    description: "Browser-based image tools such as image compression to reduce file sizes locally while preserving visual quality.",
    body: [
      "Compress images on-device using browser canvas capabilities so photos stay private.",
      "Ideal for faster web pages, lighter attachments and quick media prep.",
      "Because pictures are processed on your own device and never uploaded, this is a sensible place for personal photos, scanned documents and unreleased product shots that you would rather not hand to a third-party server.",
    ],
    icon: "sparkles",
    keywords: ["image tools", "image compressor", "compress image online", "browser image optimizer"],
  },
  {
    slug: "design-color-tools",
    name: "Design and Color Tools",
    tagline: "Color conversion and visual palette helpers for UI and brand work.",
    description: "Client-side color tools for converting color formats and supporting consistent interface design.",
    body: [
      "Convert color values accurately and copy ready-to-use formats for stylesheets and design systems.",
      "Designed for designers and frontend developers working in the browser.",
      "The color converter moves a value between common web color formats, so a swatch copied from a design file can go straight into CSS without a trip to another app.",
    ],
    icon: "eye",
    keywords: ["color tools", "color converter", "hex to rgb", "design color utilities"],
  },
  {
    slug: "social-media-tools",
    name: "Social Media Tools",
    tagline: "Client-side text, caption and link helpers for social creators.",
    description: "Browser-based social media tools for formatting captions, checking lengths and preparing shareable text locally.",
    body: [
      "Draft and format posts, links and text snippets locally without logging into third-party accounts.",
      "Built for creators, marketers and social managers who value speed and privacy.",
      "Tools in this group focus on the small jobs that eat a creator's day: trimming text to platform limits, tidying links and preparing captions, all without connecting an account.",
    ],
    icon: "message",
    keywords: ["social media tools", "caption formatter", "social post helper", "creator utilities"],
  },
  {
    slug: "generators",
    name: "Generators",
    tagline: "Instant browser generators for placeholder text, codes and identifiers.",
    description: "Client-side generators such as Lorem Ipsum and QR code generation running directly in your browser.",
    body: [
      "Generate placeholder copy, codes and test values on demand with zero server latency.",
      "Helpful for mockups, prototyping, testing and everyday publishing.",
      "Placeholder text and QR codes are both created on your device, so whatever you encode in a QR code is never sent anywhere or logged by a third-party generator.",
    ],
    icon: "zap",
    keywords: ["online generators", "lorem ipsum generator", "qr code generator", "browser generators"],
  },
  {
    slug: "time-date-tools",
    name: "Time and Date Tools",
    tagline: "Convert timestamps and inspect time values accurately in the browser.",
    description: "Client-side time and date utilities including Unix timestamp conversion for logs, APIs and schedules.",
    body: [
      "Convert between Unix timestamps and human-readable dates quickly without timezone confusion.",
      "Built for engineers, analysts and operations teams.",
      "It is most useful when a log line or API response shows a bare epoch number and you need to know which moment it actually refers to, in your own timezone and in UTC.",
    ],
    icon: "clock",
    keywords: ["timestamp converter", "unix timestamp", "date time tools", "epoch converter"],
  },
  {
    slug: "math-calculators",
    name: "Math Calculators",
    tagline: "Fast, transparent browser calculators for everyday numbers.",
    description: "Online math calculators for quick numerical calculations directly in your browser.",
    body: [
      "Run calculations immediately with clear inputs and readable results.",
      "No server calls required for everyday arithmetic and numeric checks.",
      "Calculators here show their inputs and working next to the answer, so you can check a number rather than just trust it.",
    ],
    icon: "hash",
    keywords: ["math calculators", "online calculator", "browser calculators", "calculation tools"],
  },
  {
    slug: "unit-converters",
    name: "Unit Converters",
    tagline: "Convert measurements and units cleanly on the client side.",
    description: "Browser-based unit converters for switching between measurement units with fast, reliable results.",
    body: [
      "Convert measurements in seconds across common units without installing dedicated apps.",
      "Designed for clarity and quick reference.",
      "Pick a value, choose the units on each side and read the result immediately, which suits recipes, engineering sheets and anything that crosses between metric and imperial.",
    ],
    icon: "arrow-right",
    keywords: ["unit converters", "measurement converter", "convert units online", "unit conversion tool"],
  },
  {
    slug: "web-utility-tools",
    name: "Web Utility Tools",
    tagline: "Handy browser utilities for links, strings and web workflows.",
    description: "Practical client-side web utilities designed to simplify everyday browser and site tasks.",
    body: [
      "Keep everyday web helpers one click away in a clean, fast interface.",
      "Every page stays indexable with zero server overhead.",
      "This group collects the small utilities that web workers reach for several times a week and that do not belong in a heavier category.",
    ],
    icon: "globe",
    keywords: ["web utility tools", "browser utilities", "online web tools", "free web helpers"],
  },
  {
    slug: "productivity-tools",
    name: "Productivity Tools",
    tagline: "Focused browser tools to keep daily tasks and text organized.",
    description: "Client-side productivity utilities to help structure drafts, notes and routine workflows quickly.",
    body: [
      "Stay focused with distraction-free tools that run immediately in your browser.",
      "Your working text stays local on your device.",
      "There is nothing to sign up for and nothing to sync, so a draft or a to-do list exists only in the tab you are working in.",
    ],
    icon: "check",
    keywords: ["productivity tools", "workflow helpers", "online productivity", "browser productivity"],
  },
  {
    slug: "privacy-tools",
    name: "Privacy Tools",
    tagline: "Local-first utilities engineered so sensitive data stays on your device.",
    description: "Privacy-first browser tools that process inputs locally without sending data to external servers.",
    body: [
      "Reduce exposure by running checks, transformations and formatting inside your own browser session.",
      "Aligned with ToolGlobe Pro zero-server-upload principles.",
      "Tools in this group are chosen for jobs where the input itself is the sensitive part, such as personal files, credentials and metadata, and they say plainly what is and is not processed.",
    ],
    icon: "lock",
    keywords: ["privacy tools", "local processing tools", "no upload tools", "private browser tools"],
  },
  {
    slug: "document-text-helpers",
    name: "Document and Text Helpers",
    tagline: "Preview Markdown and refine document text directly in your browser.",
    description: "Client-side document and text helpers including live Markdown previewing with zero server uploads.",
    body: [
      "Write, format and preview Markdown and structured document text smoothly in your browser.",
      "Built for documentation authors, technical writers and developers.",
      "The Markdown previewer renders as you type, builds an outline from your headings, shows reading time and exports clean Markdown or HTML. Raw HTML in the source is displayed as text rather than executed, so previewing untrusted Markdown stays safe.",
    ],
    icon: "file-text",
    keywords: ["markdown previewer", "document helpers", "markdown editor preview", "text helpers"],
  },
];

function firstSegment(slug: string): string {
  const parts = slug.split("-");
  return parts[0] ?? slug;
}

function buildAliasTable(list: Category[]): Map<string, CategorySlug> {
  const table = new Map<string, CategorySlug>();
  const uses = new Map<string, number>();
  for (const c of list) {
    table.set(c.slug, c.slug);
    const key = firstSegment(c.slug);
    uses.set(key, (uses.get(key) ?? 0) + 1);
  }
  for (const c of list) {
    const key = firstSegment(c.slug);
    if (uses.get(key) === 1 && !table.has(key)) {
      table.set(key, c.slug);
    }
  }
  return table;
}

const ALIASES = buildAliasTable(CATEGORIES);

const BY_SLUG = new Map<string, Category>(
  CATEGORIES.map((c): [string, Category] => [c.slug, c]),
);

export function getCategory(slug: string) {
  return BY_SLUG.get(slug);
}

export function getAllCategories(): Category[] {
  return CATEGORIES;
}

export function getCategorySlugs(): CategorySlug[] {
  return CATEGORIES.map((c) => c.slug);
}

export function isCategorySlug(value: string): value is CategorySlug {
  return BY_SLUG.has(value);
}

export function resolveCategorySlug(value: string) {
  return ALIASES.get(value.trim().toLowerCase());
}
