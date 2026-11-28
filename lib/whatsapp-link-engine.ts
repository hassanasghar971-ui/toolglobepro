/* WhatsApp click-to-chat link engine. Pure functions, no browser APIs. */

export const COUNTRIES = [
  { code: "PK", name: "Pakistan", dial: "92" },
  { code: "IN", name: "India", dial: "91" },
  { code: "US", name: "United States / Canada", dial: "1" },
  { code: "GB", name: "United Kingdom", dial: "44" },
  { code: "AE", name: "United Arab Emirates", dial: "971" },
  { code: "SA", name: "Saudi Arabia", dial: "966" },
  { code: "QA", name: "Qatar", dial: "974" },
  { code: "KW", name: "Kuwait", dial: "965" },
  { code: "OM", name: "Oman", dial: "968" },
  { code: "BD", name: "Bangladesh", dial: "880" },
  { code: "LK", name: "Sri Lanka", dial: "94" },
  { code: "NP", name: "Nepal", dial: "977" },
  { code: "DE", name: "Germany", dial: "49" },
  { code: "FR", name: "France", dial: "33" },
  { code: "IT", name: "Italy", dial: "39" },
  { code: "ES", name: "Spain", dial: "34" },
  { code: "NL", name: "Netherlands", dial: "31" },
  { code: "TR", name: "Turkey", dial: "90" },
  { code: "RU", name: "Russia", dial: "7" },
  { code: "BR", name: "Brazil", dial: "55" },
  { code: "MX", name: "Mexico", dial: "52" },
  { code: "NG", name: "Nigeria", dial: "234" },
  { code: "KE", name: "Kenya", dial: "254" },
  { code: "ZA", name: "South Africa", dial: "27" },
  { code: "EG", name: "Egypt", dial: "20" },
  { code: "ID", name: "Indonesia", dial: "62" },
  { code: "MY", name: "Malaysia", dial: "60" },
  { code: "SG", name: "Singapore", dial: "65" },
  { code: "PH", name: "Philippines", dial: "63" },
  { code: "JP", name: "Japan", dial: "81" },
  { code: "KR", name: "South Korea", dial: "82" },
  { code: "AU", name: "Australia", dial: "61" },
] as const;

export const DEFAULT_DIAL = "92";
export const MESSAGE_WARN_CHARS = 1000;
export const LABEL_MAX = 60;
export const DEFAULT_LABEL = "Chat on WhatsApp";

export const MESSAGE_TEMPLATES = [
  { id: "hello", label: "Say hello", text: "Hello! I would like to know more about your services." },
  { id: "order", label: "Place an order", text: "Hi! I would like to place an order." },
  { id: "available", label: "Availability", text: "Hi, is this still available?" },
  { id: "support", label: "Support", text: "Hello, I need some help with my order." },
  { id: "post", label: "From your post", text: "Hi! I saw your post and I am interested." },
] as const;

export type NumberResult = {
  digits: string;
  error: string;
  hint: string;
  ready: boolean;
};

export type LinkSet = {
  short: string;
  api: string;
  html: string;
  button: string;
  markdown: string;
};

const EMPTY_LINKS: LinkSet = { short: "", api: "", html: "", button: "", markdown: "" };

/*
  Turns what the user typed into a wa.me number (digits only, with country code).
  A leading plus or 00 means the number already contains its country code.
*/
export function buildNumber(dial: string, raw: string): NumberResult {
  const trimmed = raw.trim();
  if (trimmed === "") {
    return { digits: "", error: "", hint: "", ready: false };
  }
  if (!/\d/.test(trimmed)) {
    return { digits: "", error: "Enter the phone number using digits.", hint: "", ready: false };
  }

  const plus = trimmed.startsWith("+");
  const double0 = trimmed.startsWith("00");
  let digits = trimmed.replace(/\D/g, "");
  let hint = "";

  if (double0) {
    digits = digits.slice(2);
  }
  if (!plus && !double0) {
    const national = digits.replace(/^0+/, "");
    if (national.startsWith(dial) && national.length >= 11) {
      hint =
        "This number already seems to start with +" +
        dial +
        ". If it includes the country code, type a + at the very beginning.";
    }
    digits = dial + national;
  }

  if (digits.length < 8) {
    return {
      digits: "",
      error: "That number is too short. Use the full number including the area or mobile prefix.",
      hint,
      ready: false,
    };
  }
  if (digits.length > 15) {
    return {
      digits: "",
      error: "That number is too long. International numbers have at most 15 digits.",
      hint,
      ready: false,
    };
  }
  return { digits, error: "", hint, ready: true };
}

/* encodeURIComponent leaves ! ' ( ) * alone, which can break Markdown links. */
export function encodeText(text: string): string {
  return encodeURIComponent(text).replace(
    /[!'()*]/g,
    (ch) => "%" + ch.charCodeAt(0).toString(16).toUpperCase(),
  );
}

/* Removes characters that could break HTML or Markdown output. */
export function cleanLabel(label: string): string {
  const cleaned = label.replace(/[<>&"\[\]]/g, "").trim();
  return cleaned === "" ? DEFAULT_LABEL : cleaned;
}

export function buildLinks(digits: string, message: string, label: string): LinkSet {
  if (digits === "") {
    return EMPTY_LINKS;
  }
  const msg = message.trim();
  const enc = encodeText(msg);
  const short =
    msg === "" ? `https://wa.me/${digits}` : `https://wa.me/${digits}?text=${enc}`;
  const api =
    msg === ""
      ? `https://api.whatsapp.com/send?phone=${digits}`
      : `https://api.whatsapp.com/send?phone=${digits}&text=${enc}`;
  const name = cleanLabel(label);
  const style =
    "display:inline-block;padding:10px 18px;background:#075E54;color:#ffffff;font-family:Arial,sans-serif;font-weight:bold;text-decoration:none;border-radius:8px";
  const html = `<a href="${short}" target="_blank" rel="noopener noreferrer">${name}</a>`;
  const button = `<a href="${short}" target="_blank" rel="noopener noreferrer" style="${style}">${name}</a>`;
  const markdown = `[${name}](${short})`;
  return { short, api, html, button, markdown };
}
