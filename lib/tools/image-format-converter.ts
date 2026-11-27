import type { ToolDefinition } from "@/lib/types";

export const imageFormatConverter: ToolDefinition = {
  slug: "image-format-converter",
  name: "Image Format Converter",
  h1: "Image Format Converter: PNG, JPG and WebP",
  tagline: "Convert, resize and compress images between PNG, JPG and WebP without uploading a single file.",
  metaTitle: "Image Converter: PNG, JPG, WebP (Free, No Upload)",
  metaDescription:
    "Convert images between PNG, JPG and WebP free in your browser. Batch convert, resize, set quality and download a ZIP. Files never leave your device.",
  category: "converters",
  icon: "refresh",
  keywords: [
    "image converter",
    "png to jpg",
    "jpg to png",
    "webp to png",
    "webp to jpg",
    "png to webp",
    "jpg to webp",
    "svg to png",
    "batch image converter",
    "convert image format online without upload",
  ],
  intro:
    "Need a PNG as a JPG for an upload form, or a JPG as a lighter WebP for your website? This free image converter changes the format of one photo or a whole folder in a few taps. Choose PNG, JPG or WebP, adjust the quality, optionally shrink the size, and download the results. Everything happens inside your browser, so your pictures stay on your device.",
  howTo: [
    "Add your images by dragging them onto the drop area, or tap it to pick files from your device. You can add several at once.",
    "Choose the output format: PNG for sharp graphics and transparency, JPG for photos, or WebP for small web files.",
    "For JPG and WebP, set the quality. Around 80 to 90 percent is a good balance between size and sharpness.",
    "Optionally set a maximum width or height in pixels. Leave it empty to keep the original dimensions.",
    "Press Convert, then download each file or choose Download all as ZIP.",
  ],
  sections: [
    {
      heading: "PNG, JPG or WebP: which one should you choose?",
      paragraphs: [
        "PNG is lossless, which means every pixel is stored exactly as it was. That makes it the right choice for screenshots, logos, icons and anything with text or sharp edges, and it is the format to pick when you need a transparent background. The trade-off is file size, because a photo saved as PNG can be several times larger than the same photo saved as JPG.",
        "JPG is the old reliable of photography. It throws away detail the eye rarely notices, so photos shrink dramatically, and almost every app, printer and website accepts it. It cannot store transparency, and saving the same picture again and again at low quality slowly adds blocky artefacts, so keep your original file and convert from that.",
        "WebP is a newer format designed for the web. It usually produces smaller files than JPG or PNG at similar visual quality, and it supports transparency too. Modern browsers display it everywhere, but some older email clients, editors and print services still reject it, which is a common reason people convert WebP back to JPG or PNG.",
      ],
    },
    {
      heading: "How the conversion works without an upload",
      paragraphs: [
        "When you add a file, your browser decodes it into raw pixels, draws them onto a canvas, and then saves that canvas in the format you picked. On modern browsers this runs in a background worker, so the page stays responsive even with large photos. No request carrying your image is sent to any server, and you can confirm that by watching your browser's network tab while you convert.",
        "A side effect worth knowing: because the image is redrawn, metadata such as camera model, GPS location and capture time is not copied into the converted file. That is useful when you want to share a photo without revealing where it was taken.",
      ],
    },
    {
      heading: "Quality, resizing and transparent backgrounds",
      paragraphs: [
        "The quality slider applies to JPG and WebP. Lower values give smaller files and more visible compression, while higher values keep more detail. For photos on a website, 75 to 85 percent is usually hard to tell apart from the original. PNG ignores the slider because it is lossless.",
        "Use the maximum size field to scale large photos down. The longest side is limited to the number you enter and the other side follows proportionally, so nothing is stretched. Photos are never enlarged, because upscaling only makes them blurry. SVG files are the exception, since they are vector artwork and can be rendered crisply at any size.",
        "JPG has no transparency, so transparent areas need a colour behind them. White is the default, and you can pick any colour. If you convert a logo with a see-through background to JPG, choose the colour that matches the place it will be used.",
      ],
    },
    {
      heading: "Batch conversion, ZIP downloads and limits",
      paragraphs: [
        "You can add many images at once. They are converted one after another, which keeps memory use low, and you can cancel at any time. When the batch finishes, download the files individually or grab everything as a single ZIP archive. Each file can be up to 100 MB, and a batch can total up to 600 MB.",
        "Very large pictures can hit your device's canvas limit, especially on phones. If a conversion fails, set a smaller maximum size and try again. Animated GIFs convert as a single still frame, and SVG files are rendered at their own size unless you set a maximum size.",
      ],
    },
  ],
  faqs: [
    {
      q: "Are my images uploaded to a server?",
      a: "No. Decoding, converting and saving all happen in your browser. Nothing is sent to ToolGlobe Pro or anyone else, and there is no sign-up.",
    },
    {
      q: "Which formats can I convert from and to?",
      a: "You can save as PNG, JPG or WebP. For input, anything your browser can open works, which normally includes PNG, JPG, WebP, GIF, BMP and SVG, plus AVIF in recent browsers.",
    },
    {
      q: "Why does my converted JPG have a white background?",
      a: "JPG cannot store transparency, so transparent pixels are filled with a solid colour. White is the default, and you can pick another colour in the options before converting.",
    },
    {
      q: "Why is the PNG larger than my original JPG?",
      a: "PNG stores every pixel without loss, while JPG discards fine detail. Converting a photo from JPG to PNG does not restore that detail, it only makes the file bigger. Use PNG for graphics and screenshots, and keep photos as JPG or WebP.",
    },
    {
      q: "Why does WebP conversion fail on my device?",
      a: "Some browsers, notably certain versions of Safari, cannot save WebP from a canvas. The converter tells you when this happens. Choose PNG or JPG instead, or try a current version of Chrome, Edge or Firefox.",
    },
    {
      q: "Is there a file size or image size limit?",
      a: "Each file can be up to 100 MB and a batch up to 600 MB. Very large pixel dimensions can exceed what your device allows, in which case set a smaller maximum size and try again.",
    },
  ],
  features: [
    "Convert between PNG, JPG and WebP",
    "Reads PNG, JPG, WebP, GIF, BMP, SVG and AVIF where the browser supports them",
    "Quality control for JPG and WebP",
    "Resize by maximum width or height without stretching",
    "Custom background colour for transparent images",
    "Batch conversion with progress and cancel",
    "Download single files or one ZIP archive",
    "Runs in a background worker so the page stays responsive",
    "No upload, no sign-up and no watermark",
    "Drops camera and GPS metadata by re-encoding",
  ],
  schemaType: "WebApplication",
  maxFileMB: 100,
  related: ["image-compressor", "color-converter"],
  datePublished: "2026-11-27",
  dateModified: "2026-11-27",
};

export default imageFormatConverter;
