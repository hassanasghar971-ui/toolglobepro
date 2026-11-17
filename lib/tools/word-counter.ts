import type { Tool } from "@/lib/types";

export const wordCounterTool: Tool = {
  slug: "word-counter",
  name: "Word & Character Counter",
  description:
    "Count words, characters, sentences, paragraphs and reading time in real time. Analyze keyword density and clean up your text effortlessly.",
  category: "converters",
  icon: "code", // or align with your icon set
  keywords: [
    "word counter",
    "character counter",
    "reading time calculator",
    "keyword density",
    "text statistics",
    "syllable counter",
  ],
  seoTitle: "Word Counter & Text Statistics – Words, Characters, Reading Time",
  seoDescription:
    "Free online word counter and text statistics tool. Instantly count words, characters, sentences, paragraphs, and reading time. Includes keyword density analysis.",
  article: [
    {
      heading: "Why accurate word counting matters",
      paragraphs: [
        "Whether you are writing an academic essay, a blog post for SEO optimization, or fitting text into a strict character limit for social media, knowing your exact metrics is essential. A reliable word counter ensures you hit target lengths without manual recounting.",
        "Beyond simple word counts, understanding sentence structure, paragraph counts, and estimated reading time helps you tailor your content for better reader engagement and readability.",
      ],
    },
    {
      heading: "Key metrics provided",
      paragraphs: [
        "Our counter instantly evaluates multiple text dimensions: total words, characters (with and without spaces), sentences, paragraphs, speaking time, and average reading time based on standard adult reading speeds (~200–250 words per minute).",
        "Keyword density analysis helps content creators verify keyword frequency and avoid keyword stuffing, ensuring optimal performance for search engines.",
      ],
    },
  ],
  faqs: [
    {
      question: "Is my text uploaded or stored anywhere?",
      answer: "No. All text processing and counting happen entirely inside your browser. Nothing is sent to any server.",
    },
    {
      question: "How is reading time calculated?",
      answer: "Reading time is calculated based on an average reading speed of 225 words per minute.",
    },
  ],
};

export default wordCounterTool;
