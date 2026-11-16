import type { Category } from "./types";

export const CATEGORIES: Category[] = [
  {
    slug: "text-tools",
    name: "Text & Writing Tools",
    tagline: "Count, analyze and polish your writing",
    description:
      "Free text tools for writers, students and marketers: word counters and text analyzers that are fast, private and run entirely in your browser.",
    icon: "type",
    keywords: ["text tools", "writing tools", "word counter", "character counter", "text analyzer"],
    body: [
      "Good writing usually comes with limits: a word cap on an essay, a character ceiling on a meta description, a reading time you want to hit. The text tools in this category give you exact numbers without making you paste your draft into a stranger's server.",
      "Everything runs inside your browser, so confidential drafts, client copy and unpublished work stay on your device. Large text files are read in chunks, which means you can analyze documents far bigger than a typical online tool would accept.",
    ],
  },
  {
    slug: "developer-tools",
    name: "Developer Tools",
    tagline: "Everyday utilities for building and debugging",
    description:
      "Free developer tools including a JSON formatter and Base64 encoder. Process large payloads locally in your browser with no uploads.",
    icon: "code",
    keywords: ["developer tools", "json formatter", "base64 encoder", "online dev utilities"],
    body: [
      "These are the small utilities developers reach for dozens of times a week: formatting a messy API response, encoding a file for an email template, checking whether a payload is valid before it hits production.",
      "Because API responses and config files often contain tokens or customer data, pasting them into a random website is a risk. Here, the work is done locally, in a background thread, with streaming for big inputs, so the data never leaves your machine.",
    ],
  },
  {
    slug: "security-tools",
    name: "Security & Privacy Tools",
    tagline: "Protect your accounts and your data",
    description:
      "Free security tools like a strong password generator that runs locally in your browser. Nothing is stored, logged or sent anywhere.",
    icon: "shield",
    keywords: ["security tools", "password generator", "privacy tools", "strong passwords"],
    body: [
      "Security tools are only trustworthy if they never see your secrets. The utilities here generate and process everything on your device using the browser's built-in cryptographic random number generator.",
      "No generated value is stored or transmitted. Use them as a starting point for good habits, such as long unique passwords kept in a reputable password manager.",
    ],
  },
  {
    slug: "network-tools",
    name: "Network & IP Tools",
    tagline: "Understand your connection and location data",
    description:
      "Free network tools including an IP address and location finder. Quick, clear results with plain-English explanations of what they mean.",
    icon: "globe",
    keywords: ["network tools", "ip address lookup", "what is my ip", "ip location"],
    body: [
      "Sometimes you simply need to know what the internet sees when you connect: your public IP address, your approximate location, your provider. These tools answer that quickly and explain what the numbers mean.",
      "Network lookups need a data source by nature, so each tool states clearly which external service it contacts, and what is and isn't shared.",
    ],
  },
  {
    slug: "seo-tools",
    name: "SEO & Web Tools",
    tagline: "Clean URLs and content helpers for the web",
    description:
      "Free SEO and web tools such as a URL slug generator. Create clean, search-friendly URLs in seconds, privately in your browser.",
    icon: "trending-up",
    keywords: ["seo tools", "url slug generator", "web tools", "slugify"],
    body: [
      "Small details like a tidy URL slug or a well-sized title make a measurable difference to how your pages look in search results and get shared. These tools take care of the fiddly parts quickly.",
      "They follow widely accepted conventions, handle international characters sensibly, and run without any sign-up so you can use them mid-workflow.",
    ],
  },
];

export function getCategory(slug: string): Category | undefined {
  return CATEGORIES.find((c) => c.slug === slug);
}
