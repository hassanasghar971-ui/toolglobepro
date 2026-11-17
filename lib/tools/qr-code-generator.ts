import type { Tool } from "@/lib/types";

export const qrCodeGeneratorTool: Tool = {
  slug: "qr-code-generator",
  name: "QR Code Generator",
  description:
    "Create free QR codes for links, text, Wi-Fi, contacts, email, SMS and WhatsApp. Choose colours and error correction, then download PNG or SVG.",
  category: "developer",
  icon: "qr",
  keywords: [
    "qr code generator",
    "free qr code",
    "wifi qr code",
    "vcard qr code",
    "whatsapp qr code",
    "qr code svg",
    "qr code png download",
    "url to qr code",
  ],
  seoTitle: "Free QR Code Generator – URL, Wi-Fi, vCard, WhatsApp | PNG & SVG",
  seoDescription:
    "Free QR code generator that runs in your browser. Make QR codes for URLs, Wi-Fi, contacts, email, SMS and WhatsApp with custom colours and download PNG or SVG. No sign-up, no expiry.",
  article: [
    {
      heading: "What is inside a QR code",
      paragraphs: [
        "A QR code is simply a grid of black and white squares that encodes a short piece of data: a web address, a few lines of text, a phone number. The three large squares in the corners tell a camera where the code starts and how it is rotated, and the rest of the grid carries your data plus extra repair information. Because the data lives in the picture itself, a code you make here keeps working forever. There is no account behind it and nothing that can expire.",
        "This generator builds the code entirely in your browser. Your link, your Wi-Fi password or your contact details are never sent anywhere, which is worth knowing before you encode anything private.",
      ],
    },
    {
      heading: "Pick the right type of content",
      paragraphs: [
        "A plain website code is the most common, but scanners understand several special formats, and using the right one saves your audience typing. A Wi-Fi code lets guests join your network with one tap. A contact code adds a person to the phone's address book. Email, SMS and phone codes start a message or a call with the details already filled in, and a WhatsApp code opens a chat with a number, optionally with a message ready to send.",
        "For WhatsApp, enter the number in full international form, with the country code first and no plus sign or leading zeros. For websites you can leave out the https:// and the tool adds it. If a field is incomplete or invalid, you will see a short explanation instead of a broken code.",
      ],
    },
    {
      heading: "Error correction, size and contrast",
      paragraphs: [
        "Every code includes redundancy so it can still be read when part of it is scratched, dirty or covered. Level L restores about 7% of damage, M about 15%, Q about 25% and H about 30%. Higher levels survive more abuse but make the code denser, with smaller squares. Medium is a sensible default for screens and paper, while H is better for stickers that will be handled outdoors.",
        "Scanners need strong contrast, so use a dark foreground on a light background. Pale colours, or inverted codes with a light pattern on a dark ground, fail on many phones and the tool warns you before that happens. Keep the quiet zone, the blank border around the code, at four squares or more.",
      ],
    },
    {
      heading: "PNG or SVG, and how big to print",
      paragraphs: [
        "Download a PNG for websites, slides and documents. The tool scales it by whole numbers of pixels so the edges stay perfectly sharp instead of blurry. For printing, choose SVG: it is a vector file that can be enlarged to a poster or shrunk to a business card without losing any quality, and it opens in Illustrator, Inkscape, Figma and Canva.",
        "As a rule of thumb, a printed code should be at least two centimetres wide and ideally scanned from a distance of about ten times its width. Always test the final print with two or three different phones before you order a thousand flyers.",
      ],
    },
    {
      heading: "Static codes and your privacy",
      paragraphs: [
        "Many commercial QR services create dynamic codes that point to their own server, count your scans and later demand a subscription to keep the redirect alive. The codes made here are static: they contain your content directly, so they cannot be switched off, tracked or paywalled. The trade-off is that you cannot change the destination after printing, so double-check links before you publish and prefer a short, stable address you control.",
      ],
    },
  ],
  faqs: [
    {
      question: "Is this QR code generator really free?",
      answer:
        "Yes. There is no sign-up, no watermark, no scan limit and no expiry date. The codes are static and contain your data directly.",
    },
    {
      question: "Is my data sent to a server?",
      answer:
        "No. The code is generated in your browser, so links, Wi-Fi passwords and contact details never leave your device.",
    },
    {
      question: "Which error correction level should I choose?",
      answer:
        "Medium (M) suits most uses. Choose H for stickers or labels that may get scratched, and L when you need to store a lot of data in a code that stays easy to scan.",
    },
    {
      question: "Why will my QR code not scan?",
      answer:
        "The usual causes are low contrast, an inverted colour scheme, a missing quiet zone, a code printed too small or content that is too long. The tool warns you about the first three.",
    },
    {
      question: "Should I download PNG or SVG?",
      answer:
        "Use PNG for screens and documents, and SVG for print because it stays sharp at any size.",
    },
    {
      question: "How much can a QR code hold?",
      answer:
        "Up to about 2,950 bytes of text, 4,296 alphanumeric characters or 7,089 digits at the lowest correction level. Higher correction levels hold less.",
    },
  ],
};

export default qrCodeGeneratorTool;
