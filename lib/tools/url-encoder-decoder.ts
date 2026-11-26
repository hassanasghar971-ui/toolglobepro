import type { ToolDefinition } from "../types";

const urlEncoderDecoderTool: ToolDefinition = {
  slug: "url-encoder-decoder",
  name: "URL Encoder and Decoder",
  title: "URL Encoder and Decoder Online: Percent-Encode, Decode and Inspect",
  description:
    "Free URL encoder and decoder. Percent-encode or decode text, query strings and full URLs, inspect URL parts and parameters. Runs in your browser, handles big files, nothing uploaded.",
  shortDescription: "Encode, decode and inspect URLs and query strings. Private, instant and works on large files.",
  category: "developer-tools",
  icon: "code",
  keywords: [
    "url encoder",
    "url decoder",
    "url encode online",
    "url decode online",
    "percent encoding",
    "encodeuricomponent online",
    "query string decoder",
    "decode %20 in url",
    "url parser online",
    "form urlencoded converter",
  ],
  intro:
    "Paste text or a link, pick encode or decode, and the result appears instantly. This URL encoder and decoder turns spaces, accents, symbols and non-Latin scripts into safe percent-encoded text, reverses the process without errors, and breaks any link into its parts and query parameters. It all happens in your browser, so private links, tokens and logs are never uploaded.",
  sections: [
    {
      heading: "Why URLs need percent-encoding",
      paragraphs: [
        "A URL can safely contain only a limited set of characters. Anything else, including spaces, accented letters, emoji and symbols such as the ampersand or hash, has to be written as a percent sign followed by two hexadecimal digits. A space becomes %20, an ampersand becomes %26 and the letter e with an acute accent becomes %C3%A9 because it is sent as UTF-8 bytes. Skipping this step is a common cause of broken links, failed API calls, lost query parameters and redirect loops. This tool does the conversion correctly in one click, for a single value or for a whole list of lines.",
      ],
    },
    {
      heading: "Choose the right encoding mode",
      paragraphs: [
        "Component mode uses the same rules as the JavaScript function encodeURIComponent and is the right choice for a single query value, a path segment or a redirect target, because it also encodes slashes, question marks and equals signs. Full URL mode follows encodeURI and leaves the structure of a complete address alone while still fixing spaces and non-ASCII text. Strict RFC 3986 mode additionally encodes the characters ! ' ( ) and *, which some signature schemes and payment gateways require. Form mode matches what browsers send for HTML forms, where a space is written as a plus sign. If your text already contains some %XX sequences, tick the option to keep them so nothing is encoded twice.",
      ],
    },
    {
      heading: "Decoding that never fails on messy input",
      paragraphs: [
        "Browsers throw an error when they meet a broken percent sequence, which makes many simple decoders stop with a cryptic message. This one decodes every valid sequence and leaves the broken ones alone, then tells you how many it skipped. That makes it practical for server logs, analytics exports and copied links that were cut off or edited by hand. In form mode, plus signs become spaces before decoding, which is what you want for query strings from search forms. If the result still contains patterns like %25XX, the text was probably encoded twice, and a Decode again button lets you peel off the second layer.",
      ],
    },
    {
      heading: "Inspect any URL and handle large files",
      paragraphs: [
        "The Inspect tab splits a link into protocol, host, port, path, query string and fragment, shows a decoded version of each encoded part, and lists every query parameter in a table. It is a quick way to debug tracking links, OAuth redirects and API requests, and a reminder to check for credentials hidden inside a link. For bulk work, open a text file of up to 600 MB, such as a list of URLs or a log. It is read in chunks by a background worker with a progress bar and a cancel button, and the result is offered as a download. Nothing is sent to a server at any point.",
      ],
    },
  ],
  howTo: [
    "Choose Encode to make text safe for a URL, or Decode to turn percent-encoded text back into readable characters.",
    "Paste your text, or click Open text file, or drag a file onto the tool.",
    "Pick a mode. Use Component for a single value, Full URL for a whole address, Strict RFC 3986 for picky APIs, or Form data for HTML form style.",
    "Tick Encode each line separately if you are converting a list, or Keep existing %XX sequences to avoid double encoding.",
    "Read the result on the right. Warnings tell you about broken percent sequences or characters that could not be encoded.",
    "Click Copy result or Download .txt, or use Use result as input to chain a decode after an encode.",
    "Switch to Inspect URL to see the host, path and each query parameter of a link in a table.",
  ],
  features: [
    "Percent-encode and decode text, queries and full URLs",
    "Component, full URL, strict RFC 3986 and form data modes",
    "Tolerant decoding that leaves broken sequences alone",
    "Double-encoding detection with a Decode again button",
    "URL inspector with parts and query parameter table",
    "Per-line encoding for lists of values",
    "Streams files up to 600 MB in a background worker",
    "Progress bar with cancel",
    "Copy, download and chain results",
    "100 percent client-side with no uploads",
  ],
  faqs: [
    {
      q: "What is the difference between encodeURI and encodeURIComponent?",
      a: "encodeURI is meant for a complete address and leaves characters such as slash, colon, question mark, ampersand and equals alone. encodeURIComponent is meant for one piece of a URL, such as a query value, and encodes those characters too. Using the wrong one is a frequent source of broken links.",
    },
    {
      q: "Why does a space become %20 in one mode and a plus sign in another?",
      a: "Percent-encoding writes a space as %20. The older form encoding used by HTML forms writes it as a plus sign. Pick Form data mode when you need the plus sign, and use it when decoding query strings from forms.",
    },
    {
      q: "Is my URL or text sent to a server?",
      a: "No. Encoding, decoding and inspection run in your browser, and large files are processed by a background worker on your own device.",
    },
    {
      q: "Why do I see %25 in my result?",
      a: "%25 is an encoded percent sign. It usually means the text was encoded twice. Use Decode again, or tick Keep existing %XX sequences the next time you encode.",
    },
    {
      q: "What happens with an invalid percent sequence like 100% or %ZZ?",
      a: "Valid sequences are decoded and invalid ones are left unchanged. The tool shows how many were skipped, so decoding never stops with an error.",
    },
    {
      q: "How large a file can I process?",
      a: "Up to 600 MB. The file is read in chunks, a progress bar shows the status and you can cancel at any time. Large results are offered as a download, with a preview on screen.",
    },
  ],
};

export default urlEncoderDecoderTool;
