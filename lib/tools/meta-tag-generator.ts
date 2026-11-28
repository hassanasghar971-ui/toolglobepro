export const metaTagGeneratorTool = {
  slug: "meta-tag-generator",
  name: "Meta Tag Generator",
  h1: "Meta Tag Generator with Open Graph and X Card Preview",
  tagline:
    "Create the title, description, canonical, robots, Open Graph and X (Twitter) tags for any page, check their length and see a preview. Free, private, no sign-up.",
  metaTitle: "Meta Tag Generator - Title, Description, Open Graph",
  metaDescription:
    "Free meta tag generator. Build title, meta description, canonical, robots, Open Graph and X card tags, check length limits and preview how your page looks.",
  category: "seo-tools",
  icon: "code",
  keywords: [
    "meta tag generator",
    "meta description generator",
    "open graph generator",
    "og tag generator",
    "twitter card generator",
    "html meta tags generator",
    "seo meta tags",
    "next.js metadata generator",
  ],
  intro:
    "Meta tags are small pieces of code in the head of a page that tell search engines and social networks what the page is about. A good title and description decide how your page looks in Google, and the Open Graph tags decide what appears when someone shares your link on Facebook, LinkedIn or WhatsApp. This meta tag generator lets you fill in a simple form and get clean, correctly escaped code that you can paste straight into your page, either as plain HTML or as a Next.js metadata object. Everything is built in your browser.",
  howTo: [
    "Type your page title and meta description. The counters show how close you are to the usual display limits.",
    "Enter the full page URL. It is used for the canonical link and for og:url.",
    "Open the Open Graph section and add a share image URL, ideally 1200 x 630 pixels, plus a short description of the image.",
    "Choose an X (Twitter) card type and, if you have one, your site account.",
    "Read the check list and the two previews, fix anything marked, then choose HTML or Next.js and copy or download the code.",
  ],
  sections: [
    {
      heading: "What each tag does",
      paragraphs: [
        "The title tag is the clickable headline in search results and the text shown in the browser tab. The meta description is a short summary that search engines often show under the title. It does not directly decide your ranking, but a clear description can make more people click your result.",
        "The canonical link tells search engines which address is the main version of a page, which helps when the same content can be reached through more than one URL. The robots tag controls whether a page may be indexed and whether its links may be followed. Leave both on for pages you want to appear in search, and use noindex only for pages that should stay out of results.",
      ],
    },
    {
      heading: "Title and description length",
      paragraphs: [
        "Search engines cut off long titles and descriptions, and the exact cut depends on pixel width rather than on a fixed number of characters. As a practical guide, keep titles to about 60 characters and descriptions to about 160. Put the most important words first, write for a person instead of stuffing keywords, and give every page its own title and description. The counters in this tool warn you when you go past those guide numbers.",
      ],
    },
    {
      heading: "Open Graph and X cards for better shared links",
      paragraphs: [
        "When you paste a link into a chat or a social post, the platform reads the Open Graph tags to build the preview card with a picture, a title and a short text. Without them, the card can look empty or pick the wrong image. A share image of 1200 x 630 pixels works well on most platforms.",
        "X uses its own twitter:card tag to choose the card layout. If you leave out the other X tags, X can fall back to the Open Graph values, and this generator fills them in for you so both stay consistent.",
      ],
    },
    {
      heading: "A note on the keywords tag",
      paragraphs: [
        "Google has said it does not use the meta keywords tag, so adding it will not help you rank there. The field is optional and empty by default. If you fill it in, the tool outputs a clean, de-duplicated list, but your time is better spent on the title, the description and the content of the page.",
      ],
    },
  ],
  faqs: [
    {
      q: "How long should a meta description be?",
      a: "Aim for roughly 120 to 160 characters. Search engines may cut longer text, and they sometimes show a different snippet taken from the page. A clear, honest summary usually works best.",
    },
    {
      q: "Do meta tags improve my Google ranking?",
      a: "The title tag matters for search, and a good description can improve how often people click your result. Most other tags do not directly raise rankings, but they make your page easier to understand and share.",
    },
    {
      q: "What is the best size for an Open Graph image?",
      a: "1200 x 630 pixels is a widely used size and works on Facebook, LinkedIn, WhatsApp and X. Use a full web address for the image, not a relative path.",
    },
    {
      q: "Where do I paste the generated HTML?",
      a: "Paste the tags inside the head element of the page. Add the language code to the html tag as shown under the code box. In Next.js, use the Next.js output in a layout or page file instead.",
    },
    {
      q: "What does noindex do?",
      a: "It asks search engines not to show the page in results. Use it for private or thank-you pages. Do not use it on pages you want to rank, because the page can then disappear from search.",
    },
    {
      q: "Is my data sent to a server?",
      a: "No. The tags are built in your browser. The only network request is the optional preview image, which your browser loads from the address you typed.",
    },
  ],
  features: [
    "Title, description, canonical, robots and author tags",
    "Open Graph tags for Facebook, LinkedIn and WhatsApp",
    "X (Twitter) card tags with account handles",
    "Live length counters and a problem check list",
    "Search result and social share previews",
    "HTML output and a Next.js metadata object",
    "Copy or download the code",
    "Private: tags are built in your browser",
  ],
  schemaType: "WebApplication",
  related: ["slug-generator", "social-media-character-counter"],
  datePublished: "2026-11-27",
  dateModified: "2026-11-27",
};

export default metaTagGeneratorTool;
