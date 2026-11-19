import type { Tool } from "@/lib/types";

export const colorConverterTool: Tool = {
  slug: "color-converter",
  name: "Color Converter",
  description:
    "Convert colours between HEX, RGB, HSL, HSV, HWB, CMYK and OKLCH. Check WCAG contrast, build palettes and bulk-convert CSS — instantly in your browser.",
  category: "developer-tools",
  icon: "sparkles",
  keywords: [
    "color converter",
    "hex to rgb",
    "rgb to hex",
    "hex to hsl",
    "rgb to cmyk",
    "oklch converter",
    "color picker",
    "contrast checker",
    "css color converter",
    "color palette generator",
  ],
  seoTitle: "Color Converter – HEX, RGB, HSL, CMYK & OKLCH",
  seoDescription:
    "Convert colours between HEX, RGB, HSL, HSV, HWB, CMYK and OKLCH. WCAG contrast check, palettes and bulk CSS conversion. Free and private in your browser.",
  maxFileMB: 5,
  related: ["qr-code-generator", "image-compressor", "base64-converter"],
  article: [
    {
      heading: "What the Color Converter does",
      paragraphs: [
        "Designers hand over a HEX code, a front-end framework wants RGB, a print brief asks for CMYK and a modern CSS file prefers OKLCH. Converting between them by hand means maths nobody enjoys. The ToolGlobe Color Converter takes a colour in almost any common notation and shows it instantly as HEX, RGB, HSL, HSV, HWB, CMYK and OKLCH, each with a one-click copy button.",
        "Type or paste a value, pick one with the colour picker, or sample any pixel on your screen with the eyedropper in browsers that support it. It understands HEX in three, four, six and eight digits, rgb() and hsl() in both comma and modern space syntax, hwb(), oklch() and the standard CSS colour names. Everything runs locally, so nothing you enter leaves your device.",
      ],
    },
    {
      heading: "Understanding the colour formats",
      paragraphs: [
        "HEX and RGB describe the same thing: how much red, green and blue light to mix. HSL and HSV describe colour the way people think about it, as a hue on the colour wheel plus saturation and lightness or brightness, which makes them far easier for adjusting a shade by hand. HWB expresses a hue with an amount of white and black mixed in, and it is part of modern CSS too.",
        "OKLCH is the newest and most useful for design systems. Its lightness is perceptual, so two colours with the same L value look equally bright to the eye, which is not true for HSL. That makes it excellent for building consistent palettes and accessible contrast. CMYK is the ink model used in print. The values here use the simple mathematical conversion, so treat them as a starting point, because real printers rely on ICC profiles tuned to their paper and inks.",
      ],
    },
    {
      heading: "Contrast, shades and palettes",
      paragraphs: [
        "Below the conversions you will find a contrast check against white and black, showing the WCAG ratio and whether the colour passes AA and AAA for normal and large text. Text needs a ratio of at least 4.5 to 1 for AA at normal size, and 7 to 1 for AAA. Use it to choose a button colour that stays readable before it reaches an accessibility audit.",
        "The tool also generates nine tints and shades of your colour and five classic colour harmonies: complementary, analogous, triadic, split-complementary and tetradic. Click any swatch to make it the current colour. These give you a quick, sensible starting palette for a brand, chart or interface, which you can then refine by eye.",
      ],
    },
    {
      heading: "Bulk conversion and tips",
      paragraphs: [
        "Got a whole stylesheet to modernise? Paste a list of colours, or a chunk of CSS, into the bulk converter, choose a target format and copy the result. Each line is converted in place, and colour values inside declarations such as color: #1a2b3c; are rewritten while the rest of the line is left alone. You can also drop a text or CSS file of up to 5 MB straight onto the box.",
        "A few cautions: named colours inside CSS lines are not rewritten, because a word like red could be part of a class name. Values outside the sRGB range, which OKLCH can describe, are clipped to the nearest displayable colour. Transparency is preserved by HEX, RGB, HSL, HWB and OKLCH output but cannot be represented in HSV or CMYK, so those two ignore it.",
      ],
    },
  ],
  faqs: [
    {
      question: "Which colour formats can I enter?",
      answer:
        "HEX with 3, 4, 6 or 8 digits, with or without the # sign; rgb() and rgba(); hsl() and hsla(); hwb(); oklch(); and CSS colour names such as tomato or rebeccapurple. Both comma-separated and modern space-separated syntax work.",
    },
    {
      question: "Why do my CMYK values differ from Photoshop or my printer?",
      answer:
        "This tool uses the plain mathematical conversion from RGB. Print software uses ICC colour profiles that account for specific inks and paper, so the numbers can differ noticeably. Use these values as a starting point and confirm with your printer's proofs.",
    },
    {
      question: "What is OKLCH and why would I use it?",
      answer:
        "OKLCH is a modern colour model based on how people perceive colour. Its lightness value is consistent across hues, so palettes built with it look balanced and predictable. It is supported by current browsers in CSS through the oklch() function.",
    },
    {
      question: "What contrast ratio do I need for accessibility?",
      answer:
        "WCAG AA requires at least 4.5 to 1 for normal text and 3 to 1 for large text. AAA raises that to 7 to 1 for normal text and 4.5 to 1 for large text. The contrast panel shows which levels your colour passes against white and black.",
    },
    {
      question: "Is the colour I enter sent anywhere?",
      answer:
        "No. All conversions are calculated locally in your browser. Nothing is uploaded, stored or logged, including the files you drop into the bulk converter.",
    },
    {
      question: "Does it support transparency?",
      answer:
        "Yes. Use the opacity slider or enter a colour with an alpha value. HEX output becomes 8-digit, and RGB, HSL, HWB and OKLCH include the alpha. HSV and CMYK do not support transparency, so they ignore it.",
    },
  ],
};

export default colorConverterTool;
