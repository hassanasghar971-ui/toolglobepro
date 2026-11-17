import type { Tool } from "@/lib/types";

export const slugGeneratorTool: Tool = {
  slug: "slug-generator",
  name: "URL Slug Generator",
  description:
    "Turn any title into a clean, SEO-friendly URL slug. Handles accents, German umlauts, Cyrillic, Greek and Arabic, with bulk mode and CSV export.",
  category: "developer",
  icon: "link",
  keywords: [
    "slug generator",
    "url slug generator",
    "seo friendly url",
    "slugify online",
    "title to slug",
    "permalink generator",
    "transliterate to ascii",
    "bulk slug generator",
  ],
  seoTitle: "URL Slug Generator – SEO-Friendly Slugs, Bulk & Multilingual",
  seoDescription:
    "Free URL slug generator that runs in your browser. Converts titles to clean slugs, transliterates accents, Cyrillic, Greek and Arabic, trims length and works in bulk with CSV export.",
  article: [
    {
      heading: "What a URL slug is and why it matters",
      paragraphs: [
        "A slug is the readable last part of a web address. In example.com/blog/how-to-bake-sourdough, the slug is how-to-bake-sourdough. It tells visitors and search engines what the page is about before anyone loads it. Clean slugs are easier to read aloud, simpler to share in a chat message, and less likely to break when pasted into an email, where long strings of percent signs and random IDs tend to get mangled.",
        "Search engines use the words in a URL as a light relevance signal, and people are more inclined to click a link that looks trustworthy and descriptive. A slug will not rescue a weak page, but a tidy one removes friction and keeps your site structure understandable as it grows.",
      ],
    },
    {
      heading: "How this generator cleans your title",
      paragraphs: [
        "Paste a title and the slug updates as you type. The tool first normalises the text, removes apostrophes so that don't becomes dont rather than don-t, optionally swaps an ampersand for the word and, converts accented and non-Latin letters to plain ASCII, lowercases everything, and finally collapses anything that is not a letter or digit into a single separator. Leading and trailing separators are trimmed, so you never end up with a slug that starts or ends with a dash.",
        "You can pick a hyphen, underscore or dot as the separator. Hyphens are the safe default for web pages because search engines treat them as word breaks, while underscores are often joined into one long word. Underscores and dots are more useful for file names, database keys and code identifiers.",
      ],
    },
    {
      heading: "Accents, other alphabets and German umlauts",
      paragraphs: [
        "Real titles are not always English. The generator turns café into cafe, Łódź into lodz and ß into ss. Russian, Ukrainian, Greek and Arabic or Urdu text is transliterated letter by letter, so Москва becomes moskva. For German content, switch on the umlaut option so ä, ö and ü become ae, oe and ue, the spelling German readers expect. Characters with no sensible Latin equivalent, such as Chinese, Japanese or emoji, cannot be converted, and the tool tells you which ones were dropped.",
        "If your site deliberately uses native-script URLs, turn off the ASCII option and letters from any language are kept as they are. Browsers display these nicely, though a copied link may appear percent-encoded, so test it in the places where you will share it.",
      ],
    },
    {
      heading: "Length limits and stop words",
      paragraphs: [
        "Long slugs get cut off in search results and are awkward to share. Enable the length limit and the tool trims at a word boundary instead of chopping a word in half, so a limit of 60 never leaves you with a dangling fragment. Only when the very first word is longer than the limit is it cut hard.",
        "Stop words such as the, of, and and in add length without adding much meaning, so the optional removal turns A Guide to the Best Pizza in Naples into guide-best-pizza-naples. The list is English only, and if every word in a title is a stop word the tool keeps them all rather than hand you an empty slug. Always read the result before using it, because sometimes the small words carry the meaning.",
      ],
    },
    {
      heading: "Bulk mode for catalogues and migrations",
      paragraphs: [
        "Moving a blog or loading a product catalogue means hundreds of titles. Switch to bulk mode, paste one title per line or drop in a .txt or .csv file, and every line gets its own slug. Duplicates are a common headache, so the unique option appends -2, -3 and so on to repeated titles while respecting your length limit. Copy the whole list, or download it as a text file or a CSV that pairs each title with its slug, ready for a spreadsheet or an import script.",
        "Everything happens on your device. Your titles, product names and draft headlines are never uploaded, and the tool keeps working offline once the page has loaded. Keep in mind that changing the slug of a live page breaks existing links, so set up a redirect from the old address.",
      ],
    },
  ],
  faqs: [
    {
      question: "Which separator is best for a URL slug?",
      answer:
        "Use hyphens for web pages. Search engines treat a hyphen as a word break, whereas underscores can be read as joining words together. Underscores and dots are better suited to file names and code identifiers.",
    },
    {
      question: "Is my text uploaded anywhere?",
      answer:
        "No. All conversion happens in your browser. Titles you type, paste or load from a file never leave your device.",
    },
    {
      question: "Why did some characters disappear from my slug?",
      answer:
        "Characters with no Latin equivalent, such as Chinese, Japanese, Korean or emoji, cannot be transliterated to ASCII. The tool lists the dropped characters. Turn off “Transliterate to ASCII” if you want to keep them.",
    },
    {
      question: "Should I remove stop words from my slugs?",
      answer:
        "It is optional. Shorter slugs are easier to read and share, but removing words like “the” or “of” can change the meaning of a phrase, so check the result. Slugs with a few clear keywords usually work best.",
    },
    {
      question: "How long should a slug be?",
      answer:
        "There is no strict limit, but three to six meaningful words and under about 60 characters is a comfortable rule. Longer slugs are truncated in search results and harder to share.",
    },
    {
      question: "Can I convert many titles at once?",
      answer:
        "Yes. Bulk mode accepts up to 20,000 lines, either pasted or loaded from a text or CSV file up to 5 MB. You can copy every slug or download them as .txt or a title-and-slug CSV.",
    },
  ],
};

export default slugGeneratorTool;
