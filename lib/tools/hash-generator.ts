import type { Tool } from "@/lib/types";

export const hashGeneratorTool: Tool = {
  slug: "hash-generator",
  name: "Hash Generator",
  description:
    "Generate MD5, SHA-1, SHA-256 and SHA-512 hashes for text or files up to 600 MB. Verify downloads against a published checksum without uploading anything.",
  category: "security",
  icon: "hash",
  keywords: [
    "hash generator",
    "sha256 checksum",
    "md5 hash",
    "sha1 hash",
    "sha512 hash",
    "file checksum",
    "verify download",
    "checksum calculator",
  ],
  seoTitle: "Hash Generator – MD5, SHA-1, SHA-256, SHA-512 Online",
  seoDescription:
    "Free online hash generator and file checksum tool. Calculate MD5, SHA-1, SHA-256 and SHA-512 for text or files up to 600 MB and verify downloads privately in your browser.",
  maxFileMB: 600,
  article: [
    {
      heading: "What a hash actually is",
      paragraphs: [
        "A hash function takes any amount of data and boils it down to a short, fixed-length fingerprint. Feed it a single word or a 4 GB disk image and you get back a string of the same size every time. Change one character in the input and the fingerprint changes completely, with no resemblance to the old one. That property is what makes hashes so useful for checking that two copies of something are identical.",
        "The function only runs one way. You can turn a file into its hash in seconds, but you cannot rebuild the file from the hash. People often call hashing encryption, and it is not. There is no key and nothing to decrypt, which is why the same input always produces the same output on any machine, in any country, years apart.",
      ],
    },
    {
      heading: "Which algorithm should you pick?",
      paragraphs: [
        "This tool supports four: MD5, SHA-1, SHA-256 and SHA-512. If a website, a Linux distribution or a software vendor publishes a checksum, use whichever algorithm they used, because the strings only match when the algorithm matches. When you have a free choice, pick SHA-256. It is the sensible default for file verification, build artefacts, cache keys and content addressing.",
        "MD5 and SHA-1 are still everywhere, and they are fine for catching accidental corruption such as a truncated download or a flipped bit on a failing drive. They are not safe against a deliberate attacker, because researchers have shown practical ways to craft two different inputs with the same MD5 or SHA-1 digest. Never rely on them for signatures, certificates or anything where someone might benefit from forging a match. SHA-512 is a good choice on 64-bit machines and gives a longer digest, though for most jobs it offers no practical advantage over SHA-256.",
      ],
    },
    {
      heading: "Verifying a download, step by step",
      paragraphs: [
        "Open the File tab and drop the downloaded file onto the page. Tick the algorithm that matches the checksum the publisher gave you, then wait for the progress bar to finish. Paste the published value into the compare box. If it matches, the tool says so in green. If it does not, delete the file and download it again, ideally from a different mirror or network, because a mismatch means the bytes you received are not the bytes that were published.",
        "Spaces, colons and upper or lower case in the pasted checksum are ignored, so you can paste a value straight from a web page or a .sha256 file. Base64 digests, which some package managers use, are recognised too.",
      ],
    },
    {
      heading: "Why a 600 MB file will not freeze your browser",
      paragraphs: [
        "The browser's built-in crypto API cannot hash a stream and does not offer MD5, so it would need the whole file in memory at once. This tool uses its own implementations of all four algorithms instead and runs them in a background Web Worker. The file is read in small pieces, each piece is fed to the hasher and then thrown away, so memory use stays low and the page stays responsive while the progress bar moves.",
        "Speed depends on your device and on how many algorithms you tick, because every selected algorithm processes the same data. Large files can take from several seconds to a minute or two on a modest laptop. If you only need one checksum, untick the others and it will finish sooner. You can cancel at any time.",
      ],
    },
    {
      heading: "What hashing is not for",
      paragraphs: [
        "A plain hash is the wrong tool for storing passwords. Fast algorithms are exactly what attackers want when they try billions of guesses, so passwords belong with a slow, salted scheme such as Argon2, bcrypt or scrypt on the server. This page also does not compute HMACs, which need a secret key. Everything here happens in your browser: your text and files are never uploaded, logged or sent anywhere.",
      ],
    },
  ],
  faqs: [
    {
      question: "Is my file uploaded to a server?",
      answer:
        "No. The file is read and hashed inside your browser by a background worker. Nothing is uploaded, stored or logged, and the tool keeps working if you go offline after the page has loaded.",
    },
    {
      question: "Which algorithm should I use to verify a download?",
      answer:
        "Use the same one the publisher used, since a SHA-256 value can never equal an MD5 value. If you get to choose, SHA-256 is the best default. MD5 and SHA-1 only protect against accidental corruption, not tampering.",
    },
    {
      question: "Why do I get a different hash for the same text on another site?",
      answer:
        "Usually the input differs by a hidden character such as a trailing newline or space, or the other tool uses a different text encoding. This tool hashes text as UTF-8 exactly as typed. Even one extra space produces a completely different digest.",
    },
    {
      question: "How large a file can I hash?",
      answer:
        "Up to 600 MB. The file is processed in small chunks, so memory stays low. Time grows with file size and with the number of algorithms ticked, so untick any you do not need.",
    },
    {
      question: "Can I use these hashes to store passwords?",
      answer:
        "No. MD5, SHA-1, SHA-256 and SHA-512 are designed to be fast, which helps attackers guess passwords quickly. Use a slow, salted password hashing function such as Argon2, bcrypt or scrypt on your server instead.",
    },
    {
      question: "Does this tool support HMAC or SHA-3?",
      answer:
        "Not at the moment. It covers MD5, SHA-1, SHA-256 and SHA-512 for text and files, which handle the large majority of checksum and verification needs.",
    },
  ],
};

export default hashGeneratorTool;
