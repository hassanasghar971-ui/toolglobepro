import type { Tool } from "@/lib/types";

export const base64ConverterTool: Tool = {
  slug: "base64-converter",
  name: "Base64 Encoder & Decoder",
  description:
    "Encode or decode Base64 for text and files up to 600 MB. UTF-8 safe, URL-safe option, line wrapping and data URIs, all in your browser.",
  category: "converters",
  icon: "swap",
  keywords: [
    "base64 encoder",
    "base64 decoder",
    "base64 converter",
    "encode file to base64",
    "decode base64 online",
    "base64 data uri",
    "url safe base64",
    "utf-8 base64",
  ],
  seoTitle: "Base64 Encoder & Decoder Online – Text & Large Files (600 MB)",
  seoDescription:
    "Free Base64 encoder and decoder that runs in your browser. UTF-8 safe text, files up to 600 MB, URL-safe mode, line wrapping and data URIs. No uploads.",
  article: [
    {
      heading: "What Base64 does and why it exists",
      paragraphs: [
        "Base64 is a way of writing binary data using only 64 safe, printable characters: the letters A–Z and a–z, the digits 0–9, plus two symbols, usually + and /. It was invented because many old systems, email being the classic example, could only carry plain text reliably. Raw bytes would get mangled on the way. By regrouping every three bytes into four six-bit pieces and mapping each piece to a character, Base64 turns anything, an image, a PDF, a cryptographic key, into text that survives copying, pasting and transport.",
        "The price is size. Four characters carry three bytes, so the output is about 33% larger than the input, and a little more once line breaks are added. Base64 is also not encryption and offers no secrecy; anyone can decode it in a second. Think of it as packaging, not a lock.",
      ],
    },
    {
      heading: "Encoding text without breaking Unicode",
      paragraphs: [
        "A well-known trap is the browser's built-in btoa function, which throws an error as soon as your text contains anything outside Latin-1: an emoji, a Chinese character, even a curly quote. This tool avoids that by first converting your text to UTF-8 bytes, then encoding those bytes, and doing the reverse when decoding. That means café, 日本語 and 🚀 all round-trip perfectly and match what Python, Node.js, PHP or any other server-side language produces for the same input.",
        "When you decode, the tool checks whether the result is valid UTF-8 text. If it is not, because the data was really a picture or an archive, you get a clear warning and can download the raw bytes instead of staring at garbled characters.",
      ],
    },
    {
      heading: "Converting big files right in your browser",
      paragraphs: [
        "Most online converters upload your file to a server. This one never does. Files up to 600 MB are read in slices of roughly 2 MB inside a background Web Worker, so the page stays responsive and you see real progress. Each encoding slice is a multiple of three bytes, which guarantees the output is identical to encoding the whole file in one go, with no stray padding in the middle. You can cancel at any moment, and the finished result is assembled as a Blob that downloads instantly.",
        "A word of honesty about memory: your browser has to hold the result somewhere. Encoding a 600 MB file produces roughly 800 MB of output, which some phones and older laptops cannot handle. If the worker stops, try a smaller file, close other tabs, or switch to a desktop browser. Chrome, Edge and Firefox on a machine with 8 GB of RAM or more generally cope well.",
      ],
    },
    {
      heading: "URL-safe mode, line wrapping and data URIs",
      paragraphs: [
        "Standard Base64 uses + and /, which have special meaning in URLs. The URL-safe variant swaps them for - and _ and often drops the trailing = padding, which is what JSON Web Tokens and many APIs expect. Switch it on when you encode, and remember that decoding automatically accepts both alphabets, so you rarely need to think about it.",
        "Line wrapping splits the output every 64 or 76 characters, the layout used by MIME email and PEM certificates. The data URI option adds a prefix such as data:image/png;base64, so the result can be pasted straight into an HTML img tag or a CSS background. When you decode, a data URI prefix is detected and removed for you.",
      ],
    },
    {
      heading: "Good habits when working with Base64",
      paragraphs: [
        "Never treat Base64 as a way to hide passwords or tokens; it only changes how they look. When you decode something from an untrusted source, remember the bytes could be anything, so do not open unknown files. Because everything runs locally, nothing you paste or drop here leaves your device, which makes this a comfortable choice for configuration snippets, certificates and private documents.",
      ],
    },
  ],
  faqs: [
    {
      question: "Is my data uploaded anywhere?",
      answer:
        "No. All encoding and decoding happens inside your browser, and large files are processed in a background Web Worker on your own device. Nothing is sent to a server.",
    },
    {
      question: "How large a file can I convert?",
      answer:
        "Up to 600 MB. The limit that matters in practice is your device's memory, because the result must be held in the browser until you download it. A 600 MB encode produces about 800 MB of output.",
    },
    {
      question: "Why does my decoded result look like random symbols?",
      answer:
        "The Base64 probably represents binary data such as an image or a ZIP file rather than text. The tool will warn you in that case; use file mode or the download button to save the raw bytes.",
    },
    {
      question: "What is URL-safe Base64?",
      answer:
        "It is a variant that replaces + with - and / with _, and usually omits the = padding, so the output can sit inside URLs and filenames without escaping. JWTs use this format.",
    },
    {
      question: "Can I decode a data URI such as data:image/png;base64,...?",
      answer:
        "Yes. The prefix is recognised and stripped automatically, and in file mode the MIME type is used to suggest a sensible file extension for the download.",
    },
    {
      question: "Does Base64 encrypt my data?",
      answer:
        "No. Base64 is an encoding, not encryption. Anyone can reverse it instantly, so never use it to protect secrets.",
    },
  ],
};

export default base64ConverterTool;
