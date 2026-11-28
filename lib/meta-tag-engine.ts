export interface MetaInput {
  title: string;
  description: string;
  url: string;
  author: string;
  keywords: string;
  themeColor: string;
  language: string;
  index: boolean;
  follow: boolean;
  basics: boolean;
  ogEnabled: boolean;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageAlt: string;
  ogType: string;
  siteName: string;
  locale: string;
  twitterEnabled: boolean;
  twitterCard: string;
  twitterSite: string;
  twitterCreator: string;
}

export const DEFAULT_INPUT: MetaInput = {
  title: "",
  description: "",
  url: "",
  author: "",
  keywords: "",
  themeColor: "",
  language: "en",
  index: true,
  follow: true,
  basics: true,
  ogEnabled: true,
  ogTitle: "",
  ogDescription: "",
  ogImage: "",
  ogImageAlt: "",
  ogType: "website",
  siteName: "",
  locale: "en_US",
  twitterEnabled: true,
  twitterCard: "summary_large_image",
  twitterSite: "",
  twitterCreator: "",
};

export const SAMPLE_INPUT: MetaInput = {
  title: "Handmade Soy Candles - Free Shipping Over $40",
  description:
    "Hand-poured soy candles in 12 scents, made in small batches. Burn time up to 50 hours. Free shipping on orders over $40.",
  url: "https://www.example.com/candles",
  author: "Example Candle Co",
  keywords: "",
  themeColor: "#ffffff",
  language: "en",
  index: true,
  follow: true,
  basics: true,
  ogEnabled: true,
  ogTitle: "",
  ogDescription: "",
  ogImage: "https://www.example.com/images/candles-og.jpg",
  ogImageAlt: "Three soy candles on a wooden table",
  ogType: "website",
  siteName: "Example Candle Co",
  locale: "en_US",
  twitterEnabled: true,
  twitterCard: "summary_large_image",
  twitterSite: "@examplecandles",
  twitterCreator: "",
};

export const OG_TYPES = ["website", "article", "profile", "book", "video.other", "music.song"] as const;

export const TWITTER_CARDS = [
  { id: "summary_large_image", label: "Summary with large image" },
  { id: "summary", label: "Summary (small image)" },
] as const;

export const LIMITS = {
  title: 60,
  description: 160,
  ogTitle: 90,
  ogDescription: 200,
} as const;

export function clean(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" ? true : u.protocol === "https:";
  } catch {
    return false;
  }
}

export function lengthLevel(count: number, max: number): string {
  if (count === 0) return "empty";
  return count > max ? "over" : "ok";
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 3)).trimEnd() + "...";
}

export function displayUrl(value: string): string {
  const v = value.trim();
  if (!isHttpUrl(v)) return "example.com";
  try {
    const u = new URL(v);
    const path = u.pathname === "/" ? "" : u.pathname.replace(/\/$/, "");
    return u.host + path;
  } catch {
    return "example.com";
  }
}

export function handle(value: string): string {
  const v = value.replace(/\s/g, "");
  if (v === "") return "";
  return v.startsWith("@") ? v : "@" + v;
}

export function keywordList(value: string): string[] {
  return value
    .split(",")
    .map((s) => clean(s))
    .filter((s, i, arr) => s !== "" && arr.indexOf(s) === i);
}

function fallback(value: string, other: string): string {
  const v = clean(value);
  return v !== "" ? v : other;
}

function metaName(name: string, content: string): string {
  return '<meta name="' + name + '" content="' + escapeAttr(content) + '">';
}

function metaProp(property: string, content: string): string {
  return '<meta property="' + property + '" content="' + escapeAttr(content) + '">';
}

export function robotsValue(input: MetaInput): string {
  return (input.index ? "index" : "noindex") + ", " + (input.follow ? "follow" : "nofollow");
}

export function htmlOpenTag(input: MetaInput): string {
  const lang = input.language.trim();
  return lang === "" ? "<html>" : '<html lang="' + escapeAttr(lang) + '">';
}

export function buildTags(input: MetaInput): string[] {
  const t = clean(input.title);
  const d = clean(input.description);
  const url = input.url.trim();
  const kw = keywordList(input.keywords);
  const author = clean(input.author);
  const theme = input.themeColor.trim();
  const out: string[] = [];

  if (input.basics) {
    out.push('<meta charset="utf-8">');
    out.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  }
  if (t !== "") out.push("<title>" + escapeAttr(t) + "</title>");
  if (d !== "") out.push(metaName("description", d));
  if (kw.length > 0) out.push(metaName("keywords", kw.join(", ")));
  if (author !== "") out.push(metaName("author", author));
  out.push(metaName("robots", robotsValue(input)));
  if (theme !== "") out.push(metaName("theme-color", theme));
  if (url !== "") out.push('<link rel="canonical" href="' + escapeAttr(url) + '">');

  const ogT = fallback(input.ogTitle, t);
  const ogD = fallback(input.ogDescription, d);
  const image = input.ogImage.trim();
  const imageAlt = clean(input.ogImageAlt);

  if (input.ogEnabled) {
    out.push(metaProp("og:type", input.ogType));
    if (ogT !== "") out.push(metaProp("og:title", ogT));
    if (ogD !== "") out.push(metaProp("og:description", ogD));
    if (url !== "") out.push(metaProp("og:url", url));
    if (image !== "") out.push(metaProp("og:image", image));
    if (image !== "" && imageAlt !== "") out.push(metaProp("og:image:alt", imageAlt));
    if (clean(input.siteName) !== "") out.push(metaProp("og:site_name", clean(input.siteName)));
    if (clean(input.locale) !== "") out.push(metaProp("og:locale", clean(input.locale)));
  }

  if (input.twitterEnabled) {
    out.push(metaName("twitter:card", input.twitterCard));
    if (ogT !== "") out.push(metaName("twitter:title", ogT));
    if (ogD !== "") out.push(metaName("twitter:description", ogD));
    if (image !== "") out.push(metaName("twitter:image", image));
    if (image !== "" && imageAlt !== "") out.push(metaName("twitter:image:alt", imageAlt));
    if (handle(input.twitterSite) !== "") out.push(metaName("twitter:site", handle(input.twitterSite)));
    if (handle(input.twitterCreator) !== "") out.push(metaName("twitter:creator", handle(input.twitterCreator)));
  }

  return out;
}

export function buildHtml(input: MetaInput): string {
  return buildTags(input).join("\n");
}

export function buildNextMetadata(input: MetaInput): string {
  const q = (v: string): string => JSON.stringify(v);
  const t = clean(input.title);
  const d = clean(input.description);
  const url = input.url.trim();
  const kw = keywordList(input.keywords);
  const author = clean(input.author);
  const ogT = fallback(input.ogTitle, t);
  const ogD = fallback(input.ogDescription, d);
  const image = input.ogImage.trim();
  const imageAlt = clean(input.ogImageAlt);
  const site = handle(input.twitterSite);
  const creator = handle(input.twitterCreator);
  const lines: string[] = [];

  lines.push('import type { Metadata } from "next";');
  lines.push("");
  lines.push("export const metadata: Metadata = {");
  if (t !== "") lines.push("  title: " + q(t) + ",");
  if (d !== "") lines.push("  description: " + q(d) + ",");
  if (kw.length > 0) lines.push("  keywords: [" + kw.map((k) => q(k)).join(", ") + "],");
  if (author !== "") lines.push("  authors: [{ name: " + q(author) + " }],");
  if (url !== "") lines.push("  alternates: { canonical: " + q(url) + " },");
  lines.push("  robots: { index: " + String(input.index) + ", follow: " + String(input.follow) + " },");

  if (input.ogEnabled) {
    lines.push("  openGraph: {");
    lines.push("    type: " + q(input.ogType) + ",");
    if (ogT !== "") lines.push("    title: " + q(ogT) + ",");
    if (ogD !== "") lines.push("    description: " + q(ogD) + ",");
    if (url !== "") lines.push("    url: " + q(url) + ",");
    if (clean(input.siteName) !== "") lines.push("    siteName: " + q(clean(input.siteName)) + ",");
    if (clean(input.locale) !== "") lines.push("    locale: " + q(clean(input.locale)) + ",");
    if (image !== "") {
      const alt = imageAlt !== "" ? ", alt: " + q(imageAlt) : "";
      lines.push("    images: [{ url: " + q(image) + alt + " }],");
    }
    lines.push("  },");
  }

  if (input.twitterEnabled) {
    lines.push("  twitter: {");
    lines.push("    card: " + q(input.twitterCard) + ",");
    if (ogT !== "") lines.push("    title: " + q(ogT) + ",");
    if (ogD !== "") lines.push("    description: " + q(ogD) + ",");
    if (image !== "") lines.push("    images: [" + q(image) + "],");
    if (site !== "") lines.push("    site: " + q(site) + ",");
    if (creator !== "") lines.push("    creator: " + q(creator) + ",");
    lines.push("  },");
  }

  lines.push("};");
  return lines.join("\n");
}

export function checkInput(input: MetaInput): string[] {
  const out: string[] = [];
  const t = clean(input.title);
  const d = clean(input.description);
  const url = input.url.trim();
  const image = input.ogImage.trim();

  if (t === "") {
    out.push("Add a page title. It is the most important tag for search results.");
  } else if (t.length > LIMITS.title) {
    out.push("The title has " + t.length + " characters. Google may cut it off after about " + LIMITS.title + ".");
  }

  if (d === "") {
    out.push("Add a meta description. It is often shown under your title in search results.");
  } else if (d.length > LIMITS.description) {
    out.push(
      "The description has " + d.length + " characters. It may be shortened after about " + LIMITS.description + ".",
    );
  } else if (d.length < 70) {
    out.push("The description is quite short (" + d.length + " characters). Around 120 to 160 usually works well.");
  }

  if (url === "") {
    out.push("Add the full page URL so the canonical link and og:url can be created.");
  } else if (!isHttpUrl(url)) {
    out.push("The page URL must start with http:// or https://.");
  }

  if (input.ogEnabled) {
    if (image === "") {
      out.push("Add an image URL (1200 x 630 pixels is a good size) so shared links show a preview picture.");
    } else if (!isHttpUrl(image)) {
      out.push("The image URL must be a full address starting with http:// or https://.");
    }
  }

  if (!input.index) {
    out.push("noindex is on. Search engines will be asked NOT to show this page in results.");
  }

  return out;
}
