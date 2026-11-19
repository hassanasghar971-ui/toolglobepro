import type { Tool } from "@/lib/types";

export const loremIpsumGeneratorTool: Tool = {
  slug: "lorem-ipsum-generator",
  name: "Lorem Ipsum Generator",
  description:
    "Generate lorem ipsum placeholder text as paragraphs, sentences or words. Copy it as plain text or HTML, or download it — instantly and privately in your browser.",
  category: "text-tools",
  icon: "message",
  keywords: [
    "lorem ipsum generator",
    "placeholder text generator",
    "dummy text",
    "lorem ipsum paragraphs",
    "random text generator",
    "filler text",
    "lorem ipsum html",
    "generate lorem ipsum words",
  ],
  seoTitle: "Lorem Ipsum Generator – Free Placeholder Text",
  seoDescription:
    "Generate lorem ipsum as paragraphs, sentences or words. Plain text or HTML output, copy or download. Free, instant and private — runs in your browser.",
  related: ["word-counter", "case-converter", "slug-generator"],
  article: [
    {
      heading: "What Lorem Ipsum is and why designers use it",
      paragraphs: [
        "Lorem ipsum is placeholder text that designers, developers and publishers drop into layouts before the real copy exists. Because it looks like readable language without actually saying anything, it lets you judge typography, spacing and visual rhythm without being distracted by the meaning of the words. The ToolGlobe Lorem Ipsum Generator produces as much of it as you need, as paragraphs, sentences or individual words, with a single click.",
        "The passage traces back to a work by the Roman writer Cicero, written in 45 BC, which was scrambled by an unknown typesetter centuries ago and has been used as dummy text ever since. It is not proper Latin, and that is the point: it keeps readers from trying to read it and keeps attention on the design.",
      ],
    },
    {
      heading: "Choosing paragraphs, sentences or words",
      paragraphs: [
        "Use paragraphs when you are filling a blog post, article or landing page and want realistic blocks of body text. Choose short paragraphs for mobile mockups and cards, medium for typical articles and long when you need to test how a wide column handles a wall of text. The first paragraph can open with the familiar words Lorem ipsum dolor sit amet, or you can switch that off for fully random text.",
        "Sentences are ideal for captions, testimonials and descriptions where you need a precise amount of text, while words let you hit an exact length for headlines, buttons, tags and input fields. A count of five words gives you a plausible heading, and a count of 25 gives you a realistic product blurb. Every option is capped at a sensible maximum so the browser stays quick.",
      ],
    },
    {
      heading: "Output formats for developers",
      paragraphs: [
        "Plain text separates paragraphs with a blank line, ready to paste into a design tool, a CMS or a document. HTML paragraphs wrap each block in p tags so you can drop the result directly into a template, and the HTML list option wraps each item in li tags inside a ul, which suits navigation menus, feature lists and card grids.",
        "Press Regenerate for a fresh variation whenever the same text starts to look repetitive. The generator uses a seeded random sequence, so each press produces a different arrangement of the word bank. Copy the result to the clipboard or download it as a .txt or .html file. The word and character counters under the output make it easy to match a specific length requirement.",
      ],
    },
    {
      heading: "Tips for using placeholder text well",
      paragraphs: [
        "Placeholder text is a tool for early drafts, not for finished pages. Real content has headings, lists, numbers and long words that behave differently from Latin filler, so test your layout with genuine copy before launch. Search engines can also treat leftover filler as thin or low-quality content, so make a habit of searching your pages for the word ipsum before you publish.",
        "Accessibility is another reason to be careful. Screen readers will try to pronounce Latin text using the page language, which sounds confusing in a demo for stakeholders. Mark placeholder regions clearly in prototypes and replace them as soon as the real wording is approved. Everything here runs in your browser, so nothing about your project is sent to a server.",
      ],
    },
  ],
  faqs: [
    {
      question: "What is lorem ipsum?",
      answer:
        "Lorem ipsum is dummy text used to fill layouts before final copy is ready. It looks like natural language, so it shows how a design handles text without distracting readers with actual meaning.",
    },
    {
      question: "Is lorem ipsum real Latin?",
      answer:
        "Not really. It is derived from a text by Cicero from 45 BC, but the words have been altered, cut and rearranged until the result no longer makes grammatical sense in Latin.",
    },
    {
      question: "Can I use the generated text commercially?",
      answer:
        "Yes. The classic passage is far too old to be under copyright, and the text produced here is free to use in any personal or commercial project, with no attribution required.",
    },
    {
      question: "How do I get an exact number of words?",
      answer:
        "Choose Words, type the number you need, and the output contains exactly that many words. Use it for headlines, button labels, meta descriptions or any field with a character budget.",
    },
    {
      question: "Why does the text always start with “Lorem ipsum dolor sit amet”?",
      answer:
        "That opening is the traditional start, and many designers expect it. Untick the “Start with Lorem ipsum” option to get fully random text from the first word.",
    },
    {
      question: "Is it a problem to leave placeholder text on a live website?",
      answer:
        "It can be. Visitors lose trust, and search engines may treat the page as low-value or duplicate content. Search your site for the word ipsum before launch to make sure no filler is left behind.",
    },
  ],
};

export default loremIpsumGeneratorTool;
