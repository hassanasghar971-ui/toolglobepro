/* Pure helpers for the social media character counter. No DOM access. */

export interface SocialTarget {
  id: string;
  platform: string;
  label: string;
  limit: number;
  weighted: boolean;
  hashtagMax: number;
  foldAt: number;
  note: string;
}

/* Published limits change over time. Edit the numbers here when a
   platform updates its rules. A zero in hashtagMax or foldAt means
   "no published value". */
export const DEFAULT_TARGET: SocialTarget = {
  id: "x-post",
  platform: "X (Twitter)",
  label: "Post",
  limit: 280,
  weighted: true,
  hashtagMax: 0,
  foldAt: 0,
  note: "Links count as 23 characters and emoji or most non-Latin characters count as 2. Premium accounts can write longer posts.",
};

export const TARGETS: SocialTarget[] = [
  DEFAULT_TARGET,
  {
    id: "x-bio",
    platform: "X (Twitter)",
    label: "Bio",
    limit: 160,
    weighted: false,
    hashtagMax: 0,
    foldAt: 0,
    note: "",
  },
  {
    id: "instagram-caption",
    platform: "Instagram",
    label: "Caption",
    limit: 2200,
    weighted: false,
    hashtagMax: 30,
    foldAt: 125,
    note: "Only the first line or two show before the more link, so put the hook first.",
  },
  {
    id: "instagram-bio",
    platform: "Instagram",
    label: "Bio",
    limit: 150,
    weighted: false,
    hashtagMax: 0,
    foldAt: 0,
    note: "",
  },
  {
    id: "tiktok-caption",
    platform: "TikTok",
    label: "Caption",
    limit: 4000,
    weighted: false,
    hashtagMax: 0,
    foldAt: 0,
    note: "TikTok has changed this limit before. Check the app if you are close to it.",
  },
  {
    id: "tiktok-bio",
    platform: "TikTok",
    label: "Bio",
    limit: 80,
    weighted: false,
    hashtagMax: 0,
    foldAt: 0,
    note: "",
  },
  {
    id: "linkedin-post",
    platform: "LinkedIn",
    label: "Post",
    limit: 3000,
    weighted: false,
    hashtagMax: 0,
    foldAt: 210,
    note: "The feed cuts long posts after roughly two to three lines, and fewer on phones.",
  },
  {
    id: "linkedin-headline",
    platform: "LinkedIn",
    label: "Headline",
    limit: 220,
    weighted: false,
    hashtagMax: 0,
    foldAt: 0,
    note: "",
  },
  {
    id: "linkedin-about",
    platform: "LinkedIn",
    label: "About section",
    limit: 2600,
    weighted: false,
    hashtagMax: 0,
    foldAt: 0,
    note: "",
  },
  {
    id: "facebook-post",
    platform: "Facebook",
    label: "Post",
    limit: 63206,
    weighted: false,
    hashtagMax: 0,
    foldAt: 0,
    note: "The limit is very high, but short posts are usually read more.",
  },
  {
    id: "threads-post",
    platform: "Threads",
    label: "Post",
    limit: 500,
    weighted: false,
    hashtagMax: 0,
    foldAt: 0,
    note: "",
  },
  {
    id: "bluesky-post",
    platform: "Bluesky",
    label: "Post",
    limit: 300,
    weighted: false,
    hashtagMax: 0,
    foldAt: 0,
    note: "Counted in visible characters (graphemes).",
  },
  {
    id: "youtube-title",
    platform: "YouTube",
    label: "Video title",
    limit: 100,
    weighted: false,
    hashtagMax: 0,
    foldAt: 0,
    note: "Titles are often cut in search results after about 60 characters.",
  },
  {
    id: "youtube-description",
    platform: "YouTube",
    label: "Video description",
    limit: 5000,
    weighted: false,
    hashtagMax: 0,
    foldAt: 0,
    note: "",
  },
  {
    id: "pinterest-title",
    platform: "Pinterest",
    label: "Pin title",
    limit: 100,
    weighted: false,
    hashtagMax: 0,
    foldAt: 0,
    note: "",
  },
  {
    id: "pinterest-description",
    platform: "Pinterest",
    label: "Pin description",
    limit: 500,
    weighted: false,
    hashtagMax: 0,
    foldAt: 0,
    note: "",
  },
  {
    id: "reddit-title",
    platform: "Reddit",
    label: "Post title",
    limit: 300,
    weighted: false,
    hashtagMax: 0,
    foldAt: 0,
    note: "",
  },
  {
    id: "mastodon-post",
    platform: "Mastodon",
    label: "Post",
    limit: 500,
    weighted: false,
    hashtagMax: 0,
    foldAt: 0,
    note: "500 is the default. Individual servers can set a different limit.",
  },
];

export const PLATFORM_NAMES: string[] = TARGETS.reduce(
  (acc: string[], t) => (acc.includes(t.platform) ? acc : [...acc, t.platform]),
  [],
);

interface SegmenterLike {
  segment: (input: string) => Iterable<{ segment: string }>;
}

/* Split text into visible characters (graphemes) so emoji with skin tones
   or joiners count once. Falls back to code points when Intl.Segmenter is
   not available. */
function buildSplitter(): (text: string) => string[] {
  const Ctor = (Intl as unknown as Record<string, unknown>)["Segmenter"];
  if (typeof Ctor === "function") {
    try {
      const seg = new (Ctor as unknown as new (l: string, o: object) => SegmenterLike)("en", {
        granularity: "grapheme",
      });
      return (text: string) => Array.from(seg.segment(text), (s) => s.segment);
    } catch {
      /* use the fallback below */
    }
  }
  return (text: string) => Array.from(text);
}

const splitter = buildSplitter();

export function splitGraphemes(text: string) {
  return splitter(text);
}

const URL_WEIGHT = 23;

export function countLinks(text: string) {
  const found = text.match(/https?:\/\/[^\s]+/g);
  return found === null ? 0 : found.length;
}

function stripLinks(text: string) {
  return text.replace(/https?:\/\/[^\s]+/g, "");
}

function xWeight(ch: string) {
  const cp = ch.codePointAt(0) ?? 0;
  if (cp <= 0x10ff) return 1;
  if (cp >= 0x2000 && cp <= 0x200d) return 1;
  if (cp >= 0x2010 && cp <= 0x201f) return 1;
  if (cp >= 0x2032 && cp <= 0x2037) return 1;
  return 2;
}

/* Approximate X length: each link counts 23, other characters use the
   weight rules above. This is an estimate, not an official counter. */
export function xLength(text: string) {
  let total = countLinks(text) * URL_WEIGHT;
  const rest = splitGraphemes(stripLinks(text));
  for (const g of rest) {
    total += xWeight(g);
  }
  return total;
}

export function usedFor(target: SocialTarget, text: string, parts: string[]) {
  return target.weighted ? xLength(text) : parts.length;
}

function isTagged(token: string, mark: string) {
  return token.length > 1 && token.startsWith(mark) && token.charAt(1) !== mark;
}

export interface TextStats {
  parts: string[];
  chars: number;
  words: number;
  lines: number;
  hashtags: number;
  mentions: number;
  links: number;
}

export function analyze(text: string): TextStats {
  const parts = splitGraphemes(text);
  const trimmed = text.trim();
  const tokens = trimmed === "" ? [] : trimmed.split(/\s+/);
  let hashtags = 0;
  let mentions = 0;
  for (const token of tokens) {
    if (isTagged(token, "#")) hashtags += 1;
    if (isTagged(token, "@")) mentions += 1;
  }
  return {
    parts,
    chars: parts.length,
    words: tokens.length,
    lines: text === "" ? 0 : text.split("\n").length,
    hashtags,
    mentions,
    links: countLinks(text),
  };
}

export function levelFor(used: number, limit: number) {
  if (used > limit) return "over";
  if (used >= limit * 0.9) return "near";
  return "ok";
}

/* Cut the text so it fits the limit. For X the length is not strictly
   linear, so a binary search keeps the result safely inside the limit. */
export function trimToLimit(text: string, target: SocialTarget) {
  const parts = splitGraphemes(text);
  if (!target.weighted) return parts.slice(0, target.limit).join("");
  if (xLength(text) <= target.limit) return text;
  let lo = 0;
  let hi = parts.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (xLength(parts.slice(0, mid).join("")) <= target.limit) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return parts.slice(0, lo).join("");
}

export function formatNumber(n: number) {
  return n.toLocaleString("en-US");
}
