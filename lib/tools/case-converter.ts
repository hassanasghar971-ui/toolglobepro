import type { Tool } from "@/lib/types";

export const caseConverterTool: Tool = {
  slug: "case-converter",
  name: "Case Converter",
  description:
    "Convert text to UPPERCASE, lowercase, Title Case, Sentence case, camelCase, snake_case, kebab-case and more — instantly and privately in your browser.",
  category: "text-tools",
  icon: "file-text",
  keywords: [
    "case converter",
    "text case converter",
    "uppercase to lowercase",
    "title case converter",
    "sentence case",
    "camelCase converter",
    "snake_case converter",
    "kebab-case converter",
    "capitalize text online",
  ],
  seoTitle: "Case Converter – UPPER, Title, camelCase & More",
  seoDescription:
    "Convert text to UPPERCASE, lowercase, Title Case, Sentence case, camelCase, snake_case and more. Free, instant and private — runs in your browser.",
  maxFileMB: 10,
  related: ["word-counter", "slug-generator"],
  article: [
    {
      heading: "What the Case Converter does",
      paragraphs: [
        "Retyping text because it came out in the wrong case is one of those small annoyances that adds up. Paste a headline written in all caps, a product list in random capitalisation or a variable name from another language's style guide, and the ToolGlobe Case Converter rewrites it in a single click. Fourteen modes cover everyday writing and programming conventions, and the result updates live as you type or change options.",
        "Everything runs in your browser. Your text is never sent to a server, which matters when you are cleaning up a draft contract, a customer list or unreleased copy. You can paste text, drag in a plain-text file up to 10 MB, copy the output, or download it as a .txt file.",
      ],
    },
    {
      heading: "Writing cases: which one fits?",
      paragraphs: [
        "UPPERCASE is for emphasis, acronyms and legal headings, and it is tiring to read in long passages. lowercase suits URLs, tags and informal captions. Sentence case capitalises only the first word of each sentence, and it is what most style guides recommend for body copy, interface labels and modern headlines.",
        "Title Case capitalises the important words and leaves small ones like “of”, “the” and “and” lowercase unless they open or close the line. Capitalize Each Word is the blunter cousin: every word gets a capital, which suits names and product lists. Alternating and inverse case exist mainly for fun and testing, but inverse case is also a quick fix for text typed with Caps Lock on by accident.",
      ],
    },
    {
      heading: "Developer cases explained",
      paragraphs: [
        "Programmers rely on naming conventions to keep code readable. camelCase starts lowercase and capitalises each later word, common in JavaScript variables. PascalCase capitalises every word and is used for classes and React components. snake_case joins lowercase words with underscores, popular in Python and database columns, while CONSTANT_CASE shouts the same idea for constants and environment variables.",
        "kebab-case uses hyphens and is the standard for CSS classes, file names and URL slugs. dot.case appears in configuration keys and package names, and path/case turns words into folder-style segments. The converter splits words intelligently: it understands spaces, punctuation and existing camelCase boundaries, so “parseHTTPResponse” becomes parse_http_response without manual editing. Each line is converted separately, so you can paste a whole list of names at once.",
      ],
    },
    {
      heading: "Tips and limits",
      paragraphs: [
        "Accented and non-Latin letters follow your browser's Unicode rules, so Ärger, café and Ελλάδα convert correctly. A few languages have special rules, such as the Turkish dotted and dotless i, that a general converter cannot guess. Always proof-read titles with proper nouns, since no tool can know that “iPhone” should stay as written unless you enable the option to keep acronyms and mixed-case words.",
        "Files up to 10 MB are accepted. Larger inputs are converted in slices with a progress bar so the page stays responsive. If you need to process much bigger files, split them first. Developer cases work line by line, so line breaks and blank lines are preserved exactly as you typed them.",
      ],
    },
  ],
  faqs: [
    {
      question: "What is the difference between Title Case and Capitalize Each Word?",
      answer:
        "Title Case keeps small words such as “of”, “and” and “the” in lowercase unless they are the first or last word. Capitalize Each Word gives every word a capital letter, with no exceptions.",
    },
    {
      question: "How does Sentence case decide where sentences begin?",
      answer:
        "It capitalises the first letter of the text and the first letter after a full stop, exclamation mark or question mark followed by a space, plus after blank lines. A standalone “i” becomes “I”. Abbreviations such as “e.g.” also count as a full stop, so the next word may get a capital. Give the result a quick proof-read.",
    },
    {
      question: "Can it convert camelCase to snake_case and back?",
      answer:
        "Yes. The converter splits words on spaces, punctuation and capital-letter boundaries, so camelCase, PascalCase, snake_case, kebab-case and plain sentences can all be converted into one another.",
    },
    {
      question: "Is my text sent to a server?",
      answer:
        "No. All conversion happens locally in your browser. Nothing is uploaded, stored or logged, so it is safe for private or unpublished text.",
    },
    {
      question: "Does it work with accents and non-English letters?",
      answer:
        "Yes. It uses your browser's built-in Unicode case rules, so accented Latin, Greek and Cyrillic letters convert correctly. Language-specific quirks such as Turkish i are not handled specially.",
    },
    {
      question: "How large a text file can I convert?",
      answer:
        "You can open or drop plain-text files up to 10 MB. Big inputs are processed in slices with a progress bar so the page stays responsive, and you can copy the result or download it as a .txt file.",
    },
  ],
};

export default caseConverterTool;
