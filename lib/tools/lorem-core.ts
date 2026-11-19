/**
 * Lorem ipsum generator. Deterministic for a given seed, so the first render is
 * identical on the server and in the browser.
 */

export type LoremUnit = "paragraphs" | "sentences" | "words";
export type LoremFormat = "plain" | "html" | "list";
export type ParagraphLength = "short" | "medium" | "long";

export interface LoremOptions {
  unit: LoremUnit;
  count: number;
  startWithLorem: boolean;
  format: LoremFormat;
  paragraphLength: ParagraphLength;
}

export const LIMITS: Record<LoremUnit, number> = {
  paragraphs: 500,
  sentences: 2000,
  words: 50000,
};

export const OPENER = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
const OPENER_WORDS = ["lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit"];

const RAW_WORDS =
  "lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum fugiat nulla pariatur excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum curabitur pretium tincidunt lacus nunc gravida orci a odio vestibulum lectus faucibus ultrices posuere cubilia curae integer vitae justo eget fermentum iaculis eu diam phasellus risus ultricies tristique aliquet tortor at auctor urna cursus metus aliquam eleifend mi sollicitudin sagittis scelerisque purus semper tellus condimentum mattis pellentesque nibh nisl proin venenatis sapien habitant morbi senectus netus malesuada fames ac turpis egestas maecenas faucibus pharetra feugiat vivamus arcu felis bibendum dignissim neque volutpat ante blandit massa vel lobortis elementum suscipit placerat porttitor rhoncus dictum fusce ullamcorper mauris leo nam libero quisque ornare consectetur sodales congue lacinia donec";

export const WORDS: string[] = Array.from(new Set(RAW_WORDS.split(" ")));

const PARAGRAPH_SENTENCES: Record<ParagraphLength, [number, number]> = {
  short: [2, 4],
  medium: [4, 7],
  long: [7, 11],
};

function mulberry32(seed: number): () => number {
  let t = seed | 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function capitalize(word: string): string {
  return word.length === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1);
}

function wrap(items: string[], format: LoremFormat, plainJoin: string): string {
  if (format === "html") return items.map((item) => `<p>${item}</p>`).join("\n");
  if (format === "list") {
    return `<ul>\n${items.map((item) => `  <li>${item}</li>`).join("\n")}\n</ul>`;
  }
  return items.join(plainJoin);
}

export function countWords(text: string): number {
  const stripped = text.replace(/<[^>]+>/g, " ").trim();
  if (stripped === "") return 0;
  return stripped.split(/\s+/).length;
}

export function generateLorem(options: LoremOptions, seed: number): string {
  const rng = mulberry32(seed);
  const count = Math.min(LIMITS[options.unit], Math.max(1, Math.floor(options.count)));

  let previous = "";
  const pickWord = (): string => {
    let word = WORDS[Math.floor(rng() * WORDS.length)];
    while (word === previous) word = WORDS[Math.floor(rng() * WORDS.length)];
    previous = word;
    return word;
  };

  const sentence = (): string => {
    const n = 6 + Math.floor(rng() * 11);
    const words: string[] = [];
    for (let i = 0; i < n; i++) words.push(pickWord());
    let firstComma = -1;
    if (n >= 8 && rng() < 0.75) {
      firstComma = 2 + Math.floor(rng() * (n - 4));
      words[firstComma] += ",";
    }
    if (n >= 13 && firstComma >= 0 && rng() < 0.5) {
      const second = Math.min(n - 2, firstComma + 3 + Math.floor(rng() * 3));
      if (second > firstComma + 1 && second < n - 1) words[second] += ",";
    }
    words[0] = capitalize(words[0]);
    return `${words.join(" ")}.`;
  };

  if (options.unit === "words") {
    const words: string[] = [];
    if (options.startWithLorem) {
      for (let i = 0; i < OPENER_WORDS.length && words.length < count; i++) {
        words.push(OPENER_WORDS[i]);
      }
      previous = words[words.length - 1] ?? "";
    }
    while (words.length < count) words.push(pickWord());
    if (options.format === "list") return wrap(words, "list", " ");
    const block = `${capitalize(words.join(" "))}.`;
    return wrap([block], options.format, " ");
  }

  if (options.unit === "sentences") {
    const sentences: string[] = [];
    for (let i = 0; i < count; i++) {
      if (i === 0 && options.startWithLorem) {
        sentences.push(OPENER);
        previous = "elit";
      } else {
        sentences.push(sentence());
      }
    }
    if (options.format === "list") return wrap(sentences, "list", " ");
    return wrap([sentences.join(" ")], options.format, " ");
  }

  const [lo, hi] = PARAGRAPH_SENTENCES[options.paragraphLength];
  const paragraphs: string[] = [];
  for (let p = 0; p < count; p++) {
    const sentenceCount = lo + Math.floor(rng() * (hi - lo + 1));
    const sentences: string[] = [];
    for (let s = 0; s < sentenceCount; s++) {
      if (p === 0 && s === 0 && options.startWithLorem) {
        sentences.push(OPENER);
        previous = "elit";
      } else {
        sentences.push(sentence());
      }
    }
    paragraphs.push(sentences.join(" "));
  }
  return wrap(paragraphs, options.format, "\n\n");
}
