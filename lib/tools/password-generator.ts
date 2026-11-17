import type { ToolDefinition } from "../types";

export const passwordGenerator: ToolDefinition = {
  slug: "password-generator",
  name: "Secure Password Generator",
  h1: "Secure Password Generator & Strength Checker",
  tagline: "Generate strong, random passwords and passphrases instantly in your browser",
  metaTitle: "Free Secure Password Generator & Strength Checker",
  metaDescription: "Create unbreakable, random passwords or readable passphrases instantly. Uses crypto-secure browser APIs. 100% private, nothing is saved or sent.",
  category: "security-tools",
  icon: "key",
  keywords: [
    "password generator",
    "secure password",
    "strong password creator",
    "random password generator",
    "passphrase generator",
    "password strength checker",
  ],
  schemaType: "WebApplication",
  datePublished: "2025-11-01",
  dateModified: "2025-11-01",
  related: ["base64-converter", "json-formatter"],
  features: [
    "Cryptographically secure generation using crypto.getRandomValues()",
    "Customizable length from 8 to 128 characters",
    "Toggles for uppercase, lowercase, numbers, and symbols",
    "Option to exclude ambiguous characters (like l, 1, O, 0)",
    "Instant copy and strength estimation",
  ],
  intro: "Using weak or reused passwords is one of the leading causes of online account breaches. This secure password generator creates unpredictable, highly complex passwords using your browser's built-in cryptographic random number generator. Nothing generated here is ever stored, logged, or transmitted anywhere.",
  howTo: [
    "Use the slider to choose your desired password length (12+ characters recommended).",
    "Select or deselect character types (uppercase, lowercase, numbers, symbols) according to your requirements.",
    "Click the generate button or let it update instantly, then click copy to save your new password.",
  ],
  sections: [
    {
      heading: "Why strong, unique passwords matter",
      paragraphs: [
        "Credential stuffing attacks test millions of compromised username and password pairs across popular websites in seconds. If you reuse the same password on multiple sites, a breach on one minor forum can compromise your primary email or bank account.",
        "A truly secure password should be long and random. Modern cracking hardware can guess short or predictable words almost instantly, whereas a 16-character random password takes centuries to crack.",
      ],
    },
    {
      heading: "How this generator works locally",
      paragraphs: [
        "Many online tools generate passwords using pseudo-random number generators that can be predicted. ToolGlobe Pro relies on the Web Crypto API (`crypto.getRandomValues`), ensuring true cryptographic randomness directly on your device.",
      ],
    },
  ],
  faqs: [
    {
      q: "Are my generated passwords stored anywhere?",
      a: "Never. All passwords are generated locally in your browser memory and vanish as soon as you close or refresh the tab.",
    },
    {
      q: "What makes a password secure?",
      a: "Length is generally more important than complexity. A 16+ character password combining upper, lower, numbers, and symbols is virtually impossible to brute-force.",
    },
  ],
};
