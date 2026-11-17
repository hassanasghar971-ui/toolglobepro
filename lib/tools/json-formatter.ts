import type { Tool } from "@/lib/types";

export const jsonFormatterTool: Tool = {
  slug: "json-formatter",
  name: "JSON Formatter & Validator",
  description:
    "Format, minify and validate JSON with exact line and column errors. Sort keys, choose indentation, browse a tree view, and process files up to 600 MB.",
  category: "developer",
  icon: "code",
  keywords: [
    "json formatter",
    "json validator",
    "json beautifier",
    "json minifier",
    "format json online",
    "validate json",
    "sort json keys",
    "large json viewer",
  ],
  seoTitle: "JSON Formatter, Validator & Minifier Online – Up to 600 MB",
  seoDescription:
    "Free JSON formatter and validator in your browser. Pretty-print, minify, sort keys, see exact error line and column, and handle huge files up to 600 MB. No uploads.",
  article: [
    {
      heading: "Why formatting JSON matters",
      paragraphs: [
        "JSON is the common language of APIs, configuration files and logs, but machines like it compact and humans do not. A single line of 40,000 characters is practically unreadable, and one missing comma can swallow an afternoon. A formatter adds consistent indentation and line breaks so the structure becomes visible, while a validator tells you whether the document is legal in the first place.",
        "This tool does formatting, minifying and validation in one place, and it runs entirely in your browser. Nothing is uploaded, which matters when the JSON contains customer records, access tokens or internal API responses. It is equally useful for developers debugging a webhook, analysts opening an export, and students learning how nested data fits together.",
      ],
    },
    {
      heading: "Errors you can actually find",
      paragraphs: [
        "When validation fails you get more than a vague “Unexpected token”. The tool reports the exact line and column, quotes the surrounding text with the problem character highlighted, and explains the usual suspects in plain language: trailing commas, single quotes instead of double quotes, unquoted property names, missing colons, raw line breaks inside strings and leading zeros in numbers. In the text editor you can jump straight to the offending character with one click.",
        "The parser follows the JSON specification strictly. Comments, trailing commas and NaN are rejected on purpose, because other tools that read your file will reject them too.",
      ],
    },
    {
      heading: "Format, minify and sort keys",
      paragraphs: [
        "Choose two spaces, four spaces or tabs for indentation, depending on your team's style guide. Minify strips every unnecessary character, which is handy before embedding JSON in a request or shrinking a payload. Sorting keys alphabetically at every level makes two documents far easier to compare in a diff.",
        "Because sorting needs the whole document in memory, it uses the browser's own parser, so duplicate keys collapse and integers beyond 2^53 may be rounded. Plain formatting and minifying work on the raw text instead, so your numbers and strings stay exactly as you wrote them, including very large integers that JavaScript would normally round.",
      ],
    },
    {
      heading: "Handling huge files",
      paragraphs: [
        "Files up to 600 MB can be processed through a background worker. Instead of loading everything at once, the tool reads the file in 4 MB slices and checks and rewrites it as a stream, so memory use stays low even for gigantic logs and database exports. Format, minify and validate all work this way, with a live progress bar and a cancel button. Sorting keys and the tree view need a complete in-memory parse, so sorting is limited to files up to 40 MB and the tree to about 1 MB of output.",
        "Be realistic about output size: pretty-printing a minified 600 MB file can easily produce well over a gigabyte, and some browsers will refuse. If that happens, validate or minify instead, or split the file first.",
      ],
    },
    {
      heading: "Tree view and a few tips",
      paragraphs: [
        "For moderate documents, switch to the tree view to collapse and expand objects and arrays, scanning the shape of a response without scrolling through hundreds of lines. Large arrays show their first few hundred items with a button to reveal more, which keeps the page fast.",
        "A final tip: validate before you format. If a file will not validate, fixing the reported line is almost always quicker than hunting by eye. Copy the cleaned result or download it as a .json file once you are happy with it.",
      ],
    },
  ],
  faqs: [
    {
      question: "Is my JSON sent to a server?",
      answer:
        "No. Everything runs locally in your browser, and big files are handled by a Web Worker on your own device. Your data never leaves it.",
    },
    {
      question: "How big can the JSON file be?",
      answer:
        "Up to 600 MB for format, minify and validate, using streaming so the whole file is never parsed at once. Key sorting is limited to 40 MB and the tree view to about 1 MB because they need a full parse.",
    },
    {
      question: "How are errors reported?",
      answer:
        "You see the line, column and byte offset of the first problem, a short explanation and a snippet of surrounding text with the offending character highlighted. In text mode, a button moves the cursor to that spot.",
    },
    {
      question: "Why does sorting keys change some numbers?",
      answer:
        "Sorting relies on the browser's JSON parser, which stores numbers as 64-bit floats. Integers larger than 9,007,199,254,740,991 can lose precision there. Format and minify keep numbers exactly as written.",
    },
    {
      question: "Does it accept comments or trailing commas?",
      answer:
        "No. Those belong to JSON5 or JSONC, not standard JSON. They are flagged as errors so your file works with every strict parser.",
    },
    {
      question: "Why did the worker stop on my huge file?",
      answer:
        "Pretty-printing can make a file several times larger and the result has to fit in browser memory. Try validate or minify, close other tabs, or use a desktop browser with more RAM.",
    },
  ],
};

export default jsonFormatterTool;
