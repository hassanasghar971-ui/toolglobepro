import type { Tool } from "@/lib/types";

export const hashGeneratorTool: Tool = {
  slug: "hash-generator",
  name: "Hash Generator & File Checksum",
  description:
    "Generate MD5, SHA-1, SHA-256 and SHA-512 hashes for text or files up to 600 MB. Verify downloads against a published checksum, all in your browser.",
  category: "security",
  icon: "hash",
  keywords: [
    "hash generator",
    "sha256 generator",
    "md5 hash generator",
    "file checksum",
    "sha512 online",
    "verify file hash",
    "sha1 generator",
    "checksum calculator",
  ],
  seoTitle: "Hash Generator – MD5, SHA-1, SHA-256, SHA-512 for Text & Files (600 MB)",
  seoDescription:
    "Free online hash generator and file checksum tool. Compute MD5, SHA-1, SHA-256 and SHA-512 for text or files up to 600 MB and verify downloads. Runs locally, no uploads.",
  article: [
    {
      heading: "What a hash is and what it is good for",
      paragraphs: [
        "A hash function turns any input, a word, a document, a 4 GB video, into a short fixed-length fingerprint. Change a single character of the input and the fingerprint changes completely, yet the same input always produces the same result. That makes hashes ideal for answering one question: is this exactly the same data as before?",
        "Developers use them to detect corrupted downloads, to deduplicate files, to build cache keys and to sign releases. System administrators compare checksums after copying backups between machines. A hash is one-way, so you cannot rebuild the original data from it, and it is not encryption.",
      ],
    },
    {
      heading: "MD5, SHA-1, SHA-256 or SHA-512?",
      paragraphs: [
        "For anything security-related, choose SHA-256 or SHA-512. MD5 and SHA-1 are still fine for spotting accidental corruption or matching a legacy checksum, but researchers have shown how to create two different files with the same MD5 or SHA-1 value, so they must not be used to prove that a file has not been tampered with.",
        "SHA-256 is the practical default: it is what most software projects publish next to their downloads. SHA-512 produces a longer fingerprint and is often faster than SHA-256 on 64-bit desktop processors in native code, though in a browser the difference is small. You can tick several algorithms at once and the file is read only a single time.",
      ],
    },
    {
      heading: "Verifying a download",
      paragraphs: [
        "When a project publishes a checksum, drop the file into the File tab, choose the matching algorithm and paste the published value into the comparison box. You get a clear match or no-match answer, and the box accepts uppercase, lowercase, spaces and Base64 forms, so you do not have to reformat anything. A mismatch means the file was damaged in transit or is not the file the publisher released. Download it again from the official source before running it.",
        "You can also export the results as a small text file in the same layout as the openssl command, which is handy for keeping a record next to your backups.",
      ],
    },
    {
      heading: "Large files without an upload",
      paragraphs: [
        "The browser's built-in crypto function needs the entire file in memory before it can start, which makes it impractical for big files. This tool instead streams the file through its own hash code in a background Web Worker, a few megabytes at a time. Memory use stays flat whether you drop a 5 MB document or a 600 MB disk image, the page never freezes, and you see live progress and speed with a cancel button.",
        "Speed depends on your device. Expect roughly tens to a few hundred megabytes per second per algorithm, so ticking all four on a very large file takes noticeably longer than ticking just SHA-256. Nothing is uploaded, and the file is never copied anywhere.",
      ],
    },
    {
      heading: "Text hashing gotchas",
      paragraphs: [
        "Text is converted to UTF-8 bytes before hashing, which matches Linux, macOS, Python and most online references. A very common source of confusion is a trailing newline: the command echo hello adds one, so its hash differs from the hash of the word hello alone. Windows line endings and invisible spaces cause the same trouble.",
        "Finally, never store passwords as a plain SHA-256 or MD5 value. Fast hashes are exactly what attackers want. Use a purpose-built password hashing function such as Argon2, scrypt or bcrypt with a unique salt.",
      ],
    },
  ],
  faqs: [
    {
      question: "Are my files uploaded to a server?",
      answer:
        "No. Files are read and hashed on your own device by a background Web Worker. Nothing is transmitted, stored or logged.",
    },
    {
      question: "How large a file can I hash?",
      answer:
        "Up to 600 MB. The file is streamed in small pieces, so memory use stays low, but hashing very large files with several algorithms ticked will take longer.",
    },
    {
      question: "Which algorithm should I use?",
      answer:
        "Use SHA-256 for almost everything. MD5 and SHA-1 are only suitable for detecting accidental corruption or matching old checksums because collisions can be forged.",
    },
    {
      question: "Why does my text hash differ from the one in my terminal?",
      answer:
        "Most often the terminal command added a trailing newline, or the text contains different line endings or invisible spaces. This tool hashes exactly what you type, encoded as UTF-8.",
    },
    {
      question: "Can I reverse a hash to get the original text?",
      answer:
        "No. Hashing is one-way. Short or common inputs can be guessed with lookup tables, which is why password storage needs salted, slow hashing instead.",
    },
    {
      question: "Can I compare against a checksum from a website?",
      answer:
        "Yes. Paste the published value into the comparison box. Hex in any letter case or Base64 is accepted, and the tool tells you which algorithm matched.",
    },
  ],
};

export default hashGeneratorTool;
