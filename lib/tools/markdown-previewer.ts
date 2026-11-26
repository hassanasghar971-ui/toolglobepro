import type { ToolDefinition } from "../types";

const markdownPreviewerTool: ToolDefinition = {
  slug: "markdown-previewer",
  name: "Markdown Previewer",
  h1: "Markdown Previewer Online",
  tagline: "Write Markdown and see a live, safe preview with outline, tables and HTML export.",
  metaTitle: "Markdown Previewer: Live Preview & HTML",
  metaDescription:
    "Free online Markdown previewer with live split view, tables, task lists, code blocks and outline. Export HTML in your browser. Nothing uploaded.",
  category: "developer-tools",
  icon: "code",
  keywords: [
    "markdown previewer",
    "markdown preview online",
    "online markdown editor",
    "live markdown viewer",
    "readme preview",
    "github style markdown preview",
    "markdown to html converter",
    "markdown viewer for large files",
    "markdown table preview",
    "online markdown renderer",
  ],
  intro:
    "Paste or write Markdown on the left and watch it render on the right as you type. This Markdown previewer is built for READMEs, documentation, changelogs, blog drafts and notes. Everything happens inside your browser, so private drafts never touch a server, and you can still open very large files without the page freezing.",
  sections: [
    {
      heading: "A live Markdown preview that never uploads your text",
      paragraphs: [
        "Most online Markdown editors send your text to a server to render it, or load tracking scripts that watch what you type. This tool does the work locally. The parser runs on your own device, so unreleased documentation, internal runbooks, client notes and draft articles stay private. You can switch between a split view, an editor-only view and a preview-only view, which makes it comfortable on a wide monitor and on a phone. A word count, character count, line count and estimated reading time update as you write, and a clickable outline built from your headings lets you jump around long documents quickly.",
      ],
    },
    {
      heading: "Made for READMEs, documentation and technical writing",
      paragraphs: [
        "The previewer understands the Markdown features developers use every day: headings from level one to six, bold, italic and strikethrough text, inline code, fenced code blocks with a language label, blockquotes, horizontal rules, nested bulleted and numbered lists, task lists with checkboxes, links, images and GitHub-style tables with left, centre and right alignment. Heading anchors are generated automatically, so links such as a table of contents entry jump to the matching section. When your draft looks right, copy the generated HTML or download a standalone HTML file that you can attach to an email, host on a static site or hand to a colleague who does not use Markdown.",
      ],
    },
    {
      heading: "Large files, streaming and a safe renderer",
      paragraphs: [
        "Big exports, long changelogs and generated documentation can run to tens or hundreds of megabytes. Instead of loading them into a text box, the previewer reads the file in small chunks inside a background worker, shows a progress bar and lets you cancel at any time. Files up to 600 MB are supported, and the page stays responsive while it works. The preview is drawn in pages of 200 blocks with a Show more button, so even a huge document opens quickly. For safety, raw HTML in your Markdown is displayed as plain text rather than executed, only web, email, phone and relative links are allowed, and remote images stay blocked until you tick the option to load them.",
      ],
    },
    {
      heading: "Who uses a Markdown previewer and why",
      paragraphs: [
        "Developers use it to check a README before pushing to a repository. Technical writers use it to proofread documentation without setting up a static site generator. Students and researchers keep notes in Markdown and want a quick way to see the formatting. Bloggers who write in plain text use it to catch broken lists and tables before publishing. Because there is no sign-up, no upload limit tied to an account and no server cost, it is just as handy for a ten-line snippet as for a book-length manuscript. Bookmark the page and it works offline-friendly after the first load, with your text never leaving the tab.",
      ],
    },
  ],
  howTo: [
    "Type or paste your Markdown into the editor, or click Load sample to see every supported feature.",
    "To open a file, click Open Markdown file or drag a .md or .txt file onto the tool. Files up to 600 MB are streamed in chunks.",
    "Choose Split, Editor or Preview to arrange the workspace for your screen.",
    "Use the outline on the left of the preview to jump to any heading in a long document.",
    "Tick Load remote images only if you trust the image hosts. They stay blocked by default to protect your privacy.",
    "Click Copy HTML or Download .html to export the rendered result, or Download .md to save your source.",
    "Click Clear to remove the document and release memory when you are done.",
  ],
  features: [
    "Live split-view Markdown preview",
    "GitHub-style tables, task lists and fenced code blocks",
    "Clickable outline built from headings",
    "Streams files up to 600 MB in a background worker",
    "Progress bar with cancel for large files",
    "Copy and download rendered HTML",
    "Raw HTML shown as text for safety",
    "Remote images blocked until you allow them",
    "Word count, character count and reading time",
    "100 percent client-side with no uploads",
  ],
  faqs: [
    {
      q: "Is my Markdown uploaded to a server?",
      a: "No. Parsing and rendering both happen in your browser, and large files are read locally in a background worker. Nothing is sent anywhere.",
    },
    {
      q: "How large a file can I open?",
      a: "Up to 600 MB. Files over 2 MB are streamed in chunks without being loaded into the editor. For very large files the preview shows the first 20,000 blocks, while the word and line counts cover the whole file.",
    },
    {
      q: "Does it support GitHub-flavored Markdown?",
      a: "It supports the most common GitHub-style features: tables with alignment, task lists, strikethrough, fenced code blocks and automatic links. It is a fast, practical renderer, so rarely used extras such as footnotes, reference-style links and math are not rendered.",
    },
    {
      q: "Why is my HTML tag showing as text?",
      a: "Raw HTML is intentionally displayed as plain text. This prevents scripts or tracking elements in pasted documents from running, which keeps the previewer safe for untrusted files.",
    },
    {
      q: "Why are my images not showing?",
      a: "Images hosted on other websites are blocked by default because loading them reveals your IP address to the host. Tick Load remote images to display them. Embedded data images in PNG, GIF, JPEG and WebP format always display.",
    },
    {
      q: "Can I export the result as HTML?",
      a: "Yes. Use Copy HTML to put the markup on your clipboard or Download .html for a complete standalone page with basic styling and no scripts.",
    },
  ],
  schemaType: "WebApplication",
  maxFileMB: 600,
  related: ["csv-to-json", "url-encoder-decoder", "json-formatter"],
  datePublished: "2026-11-26",
  dateModified: "2026-11-26",
};

export default markdownPreviewerTool;
