interface ContentSection {
  heading: string;
  paragraphs: string[];
}

interface Tool {
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  keywords: string[];
  seoTitle: string;
  seoDescription: string;
  article: ContentSection[];
  faqs: { question: string; answer: string }[];
  maxFileMB?: number;
  related?: string[];
}

export const urlEncoderDecoder: Tool = {
  slug: "url-encoder-decoder",
  name: "URL Encoder / Decoder",
  description:
    "Percent-encode or decode text, query strings and full URLs instantly. Four encoding modes, double-encoding fix and a built-in URL parser.",
  category: "developer-tools",
  icon: "link",
  keywords: [
    "url encoder",
    "url decoder",
    "percent encoding",
    "encodeURIComponent online",
    "urlencode online",
    "decode url online",
    "query string decoder",
    "url parser",
  ],
  seoTitle: "URL Encoder & Decoder – Percent-Encode Online Free",
  seoDescription:
    "Encode or decode URLs and query strings instantly. Component, full URI, form and strict RFC 3986 modes, double-decode and a URL parser. No upload.",
  article: [
    {
      heading: "What percent-encoding actually does",
      paragraphs: [
        "A URL can only safely carry a limited set of characters: letters, digits and a few symbols. Everything else, including spaces, accented letters, emoji and characters that have a special meaning such as & or #, has to be written as a percent sign followed by two hexadecimal digits. A space becomes %20, an ampersand becomes %26, and the word café becomes caf%C3%A9.",
        "Without that step, a search term containing an ampersand would be read as the start of a new parameter, and a hash sign would cut the address in half. Encoding is what keeps your data from being mistaken for the structure of the URL.",
      ],
    },
    {
      heading: "Four encoding modes, and when to use each",
      paragraphs: [
        "Component mode follows JavaScript's encodeURIComponent. It encodes nearly everything except letters, digits and a few marks like dash, underscore, dot and tilde, which makes it the right choice for a single query value or a path segment.",
        "Full URL mode follows encodeURI. It leaves the characters that give a URL its shape, such as colon, slash, question mark, ampersand, equals and hash, untouched, so you can clean up spaces in a complete address without breaking it. Form mode produces what an HTML form submits: spaces turn into plus signs. Strict RFC 3986 mode goes one step further than component mode and also encodes ! ' ( ) and *, which some signature schemes and strict APIs require.",
      ],
    },
    {
      heading: "%20 or plus sign?",
      paragraphs: [
        "Both represent a space, but in different places. The plus sign is only valid inside query strings and form submissions. In the path of a URL, a plus is just a plus, and a space must be %20. That is why a link that works perfectly in a query can break when you reuse the same encoded text in a path.",
        "When decoding, the tool lets you decide whether plus signs should become spaces. Leave it on for query strings and form data, and turn it off if you are decoding a path or a value where a plus sign is meant literally.",
      ],
    },
    {
      heading: "Decoding, bad sequences and double encoding",
      paragraphs: [
        "A stray percent sign that is not followed by two hex digits makes many decoders fail outright. This tool decodes everything it can, leaves the broken pieces exactly as they were, and tells you how many problems it found, so you still get a usable result.",
        "Double encoding is another classic. If %2520 appears in a URL, it was encoded twice: the %25 is an encoded percent sign, and the 20 that follows it was originally the code for a space. Switch on Decode repeatedly and the tool keeps peeling layers, up to five passes, until the text stops changing. It reports how many passes were needed.",
      ],
    },
    {
      heading: "Unicode, emoji and international text",
      paragraphs: [
        "Non-English characters are first converted to UTF-8 bytes and then each byte is percent-encoded. That is why é turns into two groups, %C3%A9, and a typical emoji turns into four. Decoding reverses the process, and it works for Arabic, Chinese, Cyrillic and every other script.",
        "Text containing a lone surrogate, which is a broken half of an emoji, cannot be encoded by the standard browser function. This tool replaces such characters with the Unicode replacement character and counts them in the problem total instead of throwing an error.",
      ],
    },
    {
      heading: "The URL parser tab",
      paragraphs: [
        "Switch to the parser tab to split any address into its parts: protocol, username, host, port, path, query and fragment. Every query parameter appears in a table with its decoded and raw form, along with a copy button for each field. It is a quick way to debug a redirect, check a tracking link or see what an API call is really sending.",
        "If you paste an address without a scheme, the parser assumes https and tells you so. Everything is calculated locally in your browser, so URLs containing tokens or private parameters are never sent anywhere.",
      ],
    },
  ],
  faqs: [
    {
      question: "What is the difference between encoding a component and a full URL?",
      answer:
        "Component mode encodes characters like / ? & = and #, which is correct for a single value inside a URL. Full URL mode leaves those structural characters alone so an entire address stays valid while spaces and unsafe characters are still encoded.",
    },
    {
      question: "Why does my space become a plus sign?",
      answer:
        "You are using Form mode, which follows the HTML form standard where spaces are written as +. Switch to Component or Strict mode if you want %20 instead.",
    },
    {
      question: "What happens when the input contains a broken % sequence?",
      answer:
        "The tool decodes all valid sequences, leaves the malformed ones unchanged and shows how many problems it found. You still get a result instead of an error message.",
    },
    {
      question: "Does it work with emoji and non-Latin scripts?",
      answer:
        "Yes. Text is converted to UTF-8 before encoding, so emoji, Arabic, Chinese, Cyrillic and accented letters encode and decode correctly. Broken emoji halves are replaced with the Unicode replacement character.",
    },
    {
      question: "Is the URL I paste sent to a server?",
      answer:
        "No. Encoding, decoding and parsing all run inside your browser. Nothing is uploaded or logged, so addresses containing private tokens stay on your device.",
    },
    {
      question: "Which characters are never percent-encoded?",
      answer:
        "Letters A to Z, digits 0 to 9 and the marks - _ . and ~ are always left alone. Component mode also keeps ! ' ( ) and *, while Strict RFC 3986 mode encodes those five as well.",
    },
  ],
  related: ["base64-converter", "slug-generator", "hash-generator", "markdown-previewer"],
};

export default urlEncoderDecoder;
