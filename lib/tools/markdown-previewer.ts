interface ContentSection {
  heading: string;
  paragraphs: string[];
}

interface Tool {
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  keywords: string[];
  seoTitle: string;
  seoDescription: string;
  article: ContentSection[];
  faqs: { question: string; answer: string }[];
  maxFileMB?: number;
  related?: string[];
}

export const markdownPreviewer: Tool = {
  slug: "markdown-previewer",
  name: "Markdown Previewer",
  description:
    "Write Markdown and see a live, safe preview. Copy clean HTML or download a standalone .html file, all inside your browser.",
  category: "developer-tools",
  icon: "file-text",
  keywords: [
    "markdown previewer",
    "markdown editor online",
    "markdown to html",
    "live markdown preview",
    "markdown viewer",
    "readme preview",
    "github markdown preview",
    "markdown table preview",
  ],
  seoTitle: "Markdown Previewer – Live Preview & HTML Export (Free)",
  seoDescription:
    "Preview Markdown live, copy clean HTML or download a standalone .html file. Safe parser, tables, task lists, code blocks. Runs 100% in your browser.",
  article: [
    {
      heading: "Why Markdown refuses to go away",
      paragraphs: [
        "Markdown was introduced in 2004 with a modest goal: let people write plain text that looks fine as it is and still converts cleanly into HTML. Twenty years later it runs README files, documentation sites, static blogs, chat apps and note-taking tools. The reason is practical. You never take your hands off the keyboard, nothing is locked inside a proprietary file, and a .md file opens on literally any device.",
        "The catch is that Markdown has no single strict standard. Different tools render the awkward edge cases differently, so a quick preview before you publish is worth the ten seconds it costs.",
      ],
    },
    {
      heading: "How the live preview works",
      paragraphs: [
        "Type or paste on the left and the rendered page updates on the right while you work. Everything happens inside your browser tab. Nothing is uploaded, no account is needed, and no request goes to a server, which means drafts of private notes, client documentation or an unreleased changelog never leave your device.",
        "The renderer was written specifically for this site instead of being pulled in from a third-party package. It reads your text block by block (headings, lists, quotes, code, tables, paragraphs) and then formats the inline pieces inside each block. For large documents the preview updates a moment after you stop typing, so the editor stays responsive.",
      ],
    },
    {
      heading: "Supported syntax",
      paragraphs: [
        "You get headings written with # signs or underlined with === and ---, bold, italic, bold-italic, strikethrough, inline code, fenced code blocks with a language label, blockquotes, ordered and unordered lists with nesting, task lists with checkboxes, tables with column alignment, horizontal rules, images, links, bare URLs, angle-bracket autolinks, hard line breaks and backslash escapes.",
        "A few things are left out on purpose: footnotes, reference-style links, math and embedded raw HTML. If you paste a div or a script tag, it shows up as literal text instead of being executed.",
      ],
    },
    {
      heading: "Safe by design",
      paragraphs: [
        "Many online previewers convert your Markdown and then drop the result straight into the page, trusting a filter to catch anything dangerous. Here the dangerous part never exists. Every character of text is HTML-escaped before it reaches the preview, so raw HTML cannot run.",
        "Links are limited to http, https, mailto, tel and relative addresses, so javascript: and data: links are dropped and only their visible text remains. Images are limited to http, https and relative paths. External links open in a new tab with noopener, noreferrer and nofollow. In practice you can preview a README from a stranger without worrying about what is hiding inside it.",
      ],
    },
    {
      heading: "Getting HTML out of your Markdown",
      paragraphs: [
        "The Copy HTML button gives you just the fragment: headings, paragraphs, lists and tables with no html or body wrapper. That is what you want for a CMS editor, an email template or a static page you are assembling by hand. Headings receive id attributes starting with md- so you can link straight to a section.",
        "Download .html produces a complete, standalone page with a small embedded stylesheet that follows the reader's light or dark preference. You can open it in any browser, attach it to an email or drop it on any static host. Images still point to their original addresses, so they need an internet connection to appear.",
      ],
    },
    {
      heading: "Mistakes that break rendering",
      paragraphs: [
        "Most problems come from a handful of habits. A list or table that starts directly under a paragraph with no blank line in between may be read as part of the paragraph. A line indented by four spaces turns into a code block, even when you only meant to nudge some text. Writing #Title without a space after the hash leaves you with a plain paragraph, not a heading.",
        "Inside tables, a literal pipe has to be written as \\| or it splits the cell. Underscores inside words, as in snake_case_name, are left alone, but wrapping a name in single backticks is the cleanest way to keep identifiers safe. When something looks wrong, check the HTML tab to see exactly what the parser produced.",
      ],
    },
  ],
  faqs: [
    {
      question: "Is my Markdown uploaded anywhere?",
      answer:
        "No. The text you type or open from a file is processed entirely in your browser. There is no upload and no server round trip, so private drafts stay on your device.",
    },
    {
      question: "Does it support GitHub Flavored Markdown?",
      answer:
        "The most-used GitHub extras work: tables, task lists, strikethrough, fenced code blocks and automatic links. Footnotes, reference-style links, emoji shortcodes and math are not supported.",
    },
    {
      question: "Why is my HTML tag showing up as text?",
      answer:
        "That is intentional. Raw HTML is never interpreted, which is what makes the preview safe for untrusted content. Use Markdown syntax instead, such as ** for bold or a pipe table, to get the same result.",
    },
    {
      question: "Can I paste the generated HTML into WordPress or an email?",
      answer:
        "Yes. Use Copy HTML to get a clean fragment without html or body tags. Styling comes from your theme or email template, because the fragment carries no inline CSS of its own.",
    },
    {
      question: "How large a file can I preview?",
      answer:
        "Files up to 10 MB can be opened or pasted. Very large documents render a little after you stop typing so the editor stays responsive, but the preview itself works the same way.",
    },
    {
      question: "Does the downloaded .html file work offline?",
      answer:
        "The page and its styles are fully self-contained and open without a connection. Images are the exception, because they keep pointing at their original web addresses.",
    },
  ],
  maxFileMB: 10,
  related: ["word-counter", "text-diff-checker", "json-formatter", "case-converter"],
};

export default markdownPreviewer;
