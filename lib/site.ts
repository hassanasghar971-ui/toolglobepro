export const BRAND = {
  from: "#4f46e5",
  to: "#06b6d4",
  dark: "#0b1020",
} as const;

function cleanText(value?: string): string {
  return typeof value === "string" ? value.trim() : "";
}

function toOrigin(raw: string): string {
  const text = cleanText(raw);
  if (text === "") return "";
  const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text}`;
  return withProtocol.replace(/\/+$/, "");
}

/*
  Resolution order: explicit site URL, then the Vercel production host,
  then the current deployment host, then local development.
  Only NEXT_PUBLIC_ variables are read so the server and the client
  always resolve to the same value. Each read is a literal
  process.env.NAME so Next.js can inline it at build time.
*/
function resolveSiteUrl(): string {
  const explicit = toOrigin(cleanText(process.env.NEXT_PUBLIC_SITE_URL));
  if (explicit !== "") return explicit;
  const productionHost = toOrigin(cleanText(process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL));
  if (productionHost !== "") return productionHost;
  const deploymentHost = toOrigin(cleanText(process.env.NEXT_PUBLIC_VERCEL_URL));
  if (deploymentHost !== "") return deploymentHost;
  return "http://localhost:3000";
}

export const SITE = {
  name: "ToolGlobe Pro",
  shortName: "ToolGlobe",
  tagline: "Free Online Tools That Run in Your Browser",
  description:
    "Free, private online tools for writers, developers and marketers. Count words, format JSON, generate passwords and more, all in your browser with files up to 600MB.",
  url: resolveSiteUrl(),
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

export const LEGAL_UPDATED_ISO = "2025-11-01";
export const LEGAL_UPDATED_LABEL = "November 1, 2025";

export function absoluteUrl(path = "/"): string {
  return `${SITE.url}${path.startsWith("/") ? path : `/${path}`}`;
}

export function whatsappLink(number: string, text?: string): string {
  const base = `https://wa.me/${number.replace(/\D/g, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
