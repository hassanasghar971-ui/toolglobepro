export const BRAND = {
  from: "#4f46e5",
  to: "#06b6d4",
  dark: "#0b1020",
} as const;

export const SITE = {
  name: "ToolGlobe Pro",
  shortName: "ToolGlobe",
  tagline: "Free Online Tools That Run in Your Browser",
  description:
    "Free, private online tools for writers, developers and marketers. Count words, format JSON, generate passwords and more, all in your browser with files up to 600MB.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, ""),
  locale: "en_US",
  owner: {
    name: "Hassan Asghar",
    email: "hassanasghar7868686@gmail.com",
    whatsapp: [
      { label: "WhatsApp 1", number: "923451098607", display: "+92 345 1098607" },
      { label: "WhatsApp 2", number: "923497726469", display: "+92 349 7726469" },
    ],
  },
} as const;

/** Last revision date for legal/static pages. */
export const LEGAL_UPDATED_ISO = "2025-11-01";
export const LEGAL_UPDATED_LABEL = "November 1, 2025";

export function absoluteUrl(path = "/"): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function whatsappLink(number: string, text?: string): string {
  const base = `https://wa.me/${number.replace(/\D/g, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
