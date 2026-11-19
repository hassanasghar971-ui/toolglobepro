import type { Tool } from "@/lib/types";

export const textDiffCheckerTool: Tool = {
  slug: "text-diff-checker",
  name: "Text Diff Checker",
  description:
    "Compare two texts or files and see every added and removed line, word or character highlighted. Side-by-side or unified view, with a downloadable diff — all in your browser.",
  category: "text-tools",
  icon: "eye",
  keywords: [
    "text diff checker",
    "compare two texts",
    "diff tool online",
    "text compare",
    "find differences between two files",
    "side by side diff",
    "unified diff generator",
    "compare code online",
    "document comparison",
  ],
  seoTitle: "Text Diff Checker – Compare Two Texts Online",
  seoDescription:
    "Compare two texts or files and highlight every change by line, word or character. Side-by-side view and .diff export. Private — runs in your browser.",
  maxFileMB: 20,
  related: ["word-counter", "case-converter", "json-formatter"],
  article: [
    {
      heading: "What the Text Diff Checker does",
      paragraphs: [
        "Spotting what changed between two versions of a document by eye is slow and unreliable. Your brain skips over a swapped comma, a deleted clause or a changed number, which is exactly the kind of edit that causes trouble later. The ToolGlobe Text Diff Checker lines up two texts, finds the shortest set of edits that turns one into the other, and highlights every addition and removal so nothing slips past you.",
        "Paste the original on the left and the revised version on the right, or drag a text file onto either box. The comparison runs automatically in a background worker, so the page stays responsive even with large files. Nothing is uploaded: both texts stay in your browser, which makes the tool safe for contracts, source code, client copy and anything else you would not paste into a stranger's server.",
      ],
    },
    {
      heading: "Lines, words or characters?",
      paragraphs: [
        "Line mode is the classic view used by Git and code review tools. Each line is either unchanged, removed or added, and lines that were edited are paired up so the exact words that changed are highlighted inside them. It is the best choice for code, configuration files, CSV exports, logs and any text where the line structure matters. You can read the result in a unified list or in two columns side by side.",
        "Word mode ignores line structure and compares individual words and punctuation, which suits prose such as essays, articles and legal clauses. Character mode goes finer still and is handy for spotting a single mistyped letter in a long ID, URL or hash. Both inline modes show one flowing text with deletions struck through in red and insertions highlighted in green.",
      ],
    },
    {
      heading: "Getting cleaner results",
      paragraphs: [
        "Real-world texts are rarely identical apart from the edits you care about. Turn on the case option when capitalisation changes are just noise, and the whitespace option when you are comparing text that was re-indented, re-wrapped or exported with different spacing. With both switched on you will see only the changes in the actual words.",
        "Unchanged stretches are collapsed to a few lines of context, so a two-line edit in a ten-thousand-line file is easy to find. Click any collapsed block to expand it, or choose to show everything. When you need to share the result, copy it or download it as a standard unified diff that works with git apply, patch and most code review tools.",
      ],
    },
    {
      heading: "Limits and tips",
      paragraphs: [
        "Each side accepts up to 20 MB of text. Browsers handle very large strings and pages poorly, so files above about 1 MB are kept out of the text box and shown as a loaded file instead. Word and character comparison is limited to one million characters per side; use line mode for anything bigger.",
        "The algorithm finds a minimal edit script, but if two large files are almost completely different it gives up on fine detail after a few thousand edits and shows the differing region as one replaced block. The tool tells you when this happens. For best results with huge files, compare them in sections. Binary files such as images or PDFs are rejected because they are not plain text.",
      ],
    },
  ],
  faqs: [
    {
      question: "Are my texts or files uploaded anywhere?",
      answer:
        "No. The comparison runs entirely inside your browser, in a background worker. Nothing is sent to a server, stored or logged, so it is safe for private documents and source code.",
    },
    {
      question: "What is a diff?",
      answer:
        "A diff lists the differences between two versions of a text: what was added, what was removed and what stayed the same. Developers use diffs to review code changes, and writers use them to track edits between drafts.",
    },
    {
      question: "Which comparison mode should I choose?",
      answer:
        "Use lines for code, data files and logs, words for articles and contracts, and characters for catching tiny typos in IDs, links or hashes. If you are unsure, start with lines. Changed lines are highlighted down to the word anyway.",
    },
    {
      question: "How large a file can I compare?",
      answer:
        "Up to 20 MB of text per side. Files above roughly 1 MB are compared without being displayed in the text box. Word and character modes are limited to one million characters per side, so use line mode for bigger files.",
    },
    {
      question: "Why does it say the comparison is approximate?",
      answer:
        "To stay fast, the tool searches for up to about 3,000 separate edits. If two large files differ by more than that, the remaining differing region is shown as one replaced block rather than a minimal diff. Compare smaller sections to see the fine detail.",
    },
    {
      question: "Can I export the differences?",
      answer:
        "Yes. In line mode you can copy the result or download it as a .diff file in standard unified format, with three lines of context around each change. It works with git apply, patch and most review tools.",
    },
  ],
};

export default textDiffCheckerTool;
