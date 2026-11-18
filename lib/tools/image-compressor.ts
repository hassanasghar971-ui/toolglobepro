import type { Tool } from "@/lib/types";

export const imageCompressorTool: Tool = {
  slug: "image-compressor",
  name: "Image Compressor",
  description:
    "Shrink JPEG, PNG and WebP images in your browser. Resize, convert to WebP, process in batches and download a ZIP — files never leave your device.",
  category: "seo-tools",
  icon: "sparkles",
  keywords: [
    "image compressor",
    "compress jpg",
    "compress png",
    "compress image online",
    "reduce image size",
    "webp converter",
    "batch image compressor",
    "resize image",
    "optimize images for web",
  ],
  seoTitle: "Image Compressor – Shrink JPG, PNG & WebP Free",
  seoDescription:
    "Compress JPG, PNG and WebP images up to 600 MB in your browser. Resize, convert to WebP, batch download as ZIP. Private — nothing is uploaded.",
  maxFileMB: 600,
  related: ["base64-converter", "hash-generator", "qr-code-generator"],
  article: [
    {
      heading: "What the Image Compressor does",
      paragraphs: [
        "Large photos slow down pages, clog email attachments and eat through mobile data. The ToolGlobe Image Compressor shrinks JPEG, PNG, WebP, GIF, BMP and AVIF files right inside your browser, so a 6 MB camera shot can become a 400 KB picture that still looks great on screen. Drop in one image or a few hundred, pick a quality level, and download the results one by one or as a single ZIP.",
        "Nothing is uploaded. The decoding, resizing and re-encoding all happen on your own device, using the same image engine your browser uses to display pictures. That means no waiting in a server queue, no file-size paywall and no copy of your photos sitting on somebody else's disk. Individual files can be as large as 600 MB, as long as your device has enough memory to decode them.",
      ],
    },
    {
      heading: "How the compression works",
      paragraphs: [
        "JPEG and WebP are lossy formats: they save space by discarding detail your eyes are unlikely to notice. The quality slider controls how aggressively that happens. At 80% most photos are visually indistinguishable from the original, yet the file is often a third of the size or smaller. Drop to 60% and you will start to see softness in gradients and skies, which is fine for thumbnails but not for hero images.",
        "PNG is different. It is lossless, so there is no quality dial; the pixels must come back exactly as they went in. If a PNG is really a photograph, converting it to WebP or JPEG is the biggest saving available. If it is a logo or screenshot with flat colours and sharp text, keep it as PNG and shrink the dimensions instead. The tool is honest about this: when re-encoding would make a file larger, it keeps your original and tells you so.",
      ],
    },
    {
      heading: "Choosing size and quality",
      paragraphs: [
        "Dimensions matter more than most people realise. A 4000-pixel-wide photo shown in an 800-pixel column is carrying twenty-five times more pixels than anyone will ever see. Use the maximum width option to scale the longest edge down: 1920 px suits full-width banners, 1280 px suits blog images and 800 px suits thumbnails. The tool never enlarges an image, so small files stay untouched.",
        "Some quick starting points: 75–85% quality for photographs on websites, 60–70% for email attachments, and WebP whenever the destination supports it. WebP is typically 25–35% smaller than JPEG at similar quality, and every current browser can display it. If you convert a transparent PNG to JPEG, pick a background colour first, because JPEG cannot store transparency.",
      ],
    },
    {
      heading: "Privacy, speed and limits",
      paragraphs: [
        "The work happens in a background Web Worker, so the page stays responsive while images are processed. A progress bar shows each file's current stage, and you can cancel at any time. Metadata such as GPS location and camera model is not copied into the output, which is a handy side effect when you share photos publicly.",
        "A few limits are worth knowing. Animated GIFs keep only their first frame. Images above roughly 120 megapixels are refused because browsers cannot safely allocate a canvas that large. HEIC files from iPhones are not supported by most desktop browsers, so export them as JPEG first. If a batch is huge, process it in smaller groups so your device does not run out of memory.",
      ],
    },
  ],
  faqs: [
    {
      question: "Are my images uploaded to a server?",
      answer:
        "No. Every step — decoding, resizing and compressing — runs inside your browser. The images never leave your device, and closing the tab discards everything.",
    },
    {
      question: "How much can I compress an image without visible quality loss?",
      answer:
        "For photos, 75–85% quality usually cuts the file size by 50–80% with no difference you can see at normal viewing size. Combine that with a sensible maximum width, such as 1920 px, for even bigger savings.",
    },
    {
      question: "Why did my PNG barely shrink, or stay the same?",
      answer:
        "PNG is lossless, so the quality slider cannot reduce it. Lower the maximum width, or convert photographic PNGs to WebP or JPEG. When re-encoding would not help, the tool keeps your original file rather than hand you a larger one.",
    },
    {
      question: "Does the compressor remove EXIF data and GPS location?",
      answer:
        "Yes. Images are redrawn and re-encoded, so camera details and GPS coordinates are not carried over. The picture is rotated to match its original orientation first, so photos do not turn sideways.",
    },
    {
      question: "What is the maximum file size and how many files can I add?",
      answer:
        "Each file can be up to 600 MB and you can queue up to 200 files at once. Very large images also depend on your device's memory, and anything above about 120 megapixels is refused to avoid crashes.",
    },
    {
      question: "Can I convert images to WebP or JPEG while compressing?",
      answer:
        "Yes. Choose WebP, JPEG or PNG as the output format, or leave it on “Keep original type”. If your browser cannot encode WebP, the tool falls back to JPEG automatically and tells you.",
    },
  ],
};

export default imageCompressorTool;
