export const BRAND = {
  from: "#4f46e5",
  to: "#06b6d4",
  dark: "#0b1020",
} as const;

function cleanText(value?: string): string {
  return (value ?? "").trim();
}

function toOrigin(value: string): string {
  if (value === "") {
    return "";
  }
  const withProtocol = value.startsWith("http") ? value : `https://${value}`;
  return withProtocol.replace(/\/+$/, "");
}

function resolveSiteUrl(): string {
  const explicit = toOrigin(cleanText(process.env.NEXT_PUBLIC_SITE_URL));
  if (explicit !== "") {
    return explicit;
  }
  const vercelEnv = cleanText(
    process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV,
  );
  const productionHost = toOrigin(
    cleanText(
      process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL ??
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
    ),
  );
  const deploymentHost = toOrigin(
    cleanText(process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL),
  );
  if (vercelEnv === "production" && productionHost !== "") {
    return productionHost;
  }
  if (deploymentHost !== "") {
    return deploymentHost;
  }
  if (productionHost !== "") {
    return productionHost;
  }
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
