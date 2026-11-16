import { SITE, absoluteUrl, whatsappLink } from "./site";
import type { Category, FaqItem, ToolDefinition } from "./types";

type Json = Record<string, unknown>;

const CTX = "https://schema.org";
const ORG_ID = `${SITE.url}/#organization`;

export function organizationSchema(): Json {
  return {
    "@context": CTX,
    "@type": "Organization",
    "@id": ORG_ID,
    name: SITE.name,
    url: SITE.url,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/icon"),
      width: 512,
      height: 512,
    },
    email: SITE.owner.email,
    founder: {
      "@type": "Person",
      name: SITE.owner.name,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: SITE.owner.email,
        availableLanguage: ["English"],
      },
    ],
    sameAs: SITE.owner.whatsapp.map((w) => whatsappLink(w.number)),
  };
}

export function websiteSchema(): Json {
  return {
    "@context": CTX,
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    inLanguage: "en",
    publisher: { "@id": ORG_ID },
  };
}

export function breadcrumbSchema(items: { name: string; href: string }[]): Json {
  return {
    "@context": CTX,
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.href),
    })),
  };
}

export function faqSchema(faqs: FaqItem[]): Json {
  return {
    "@context": CTX,
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.a,
      },
    })),
  };
}

const APP_CATEGORY: Record<string, string> = {
  "text-tools": "UtilitiesApplication",
  "developer-tools": "DeveloperApplication",
  "security-tools": "SecurityApplication",
  "network-tools": "UtilitiesApplication",
  "seo-tools": "BusinessApplication",
};

export function toolSchema(tool: ToolDefinition): Json {
  const url = absoluteUrl(`/tools/${tool.slug}`);
  return {
    "@context": CTX,
    "@type": tool.schemaType,
    "@id": `${url}#app`,
    name: tool.name,
    url,
    description: tool.metaDescription,
    applicationCategory: APP_CATEGORY[tool.category] ?? "UtilitiesApplication",
    operatingSystem: "Any (web browser)",
    browserRequirements: "Requires JavaScript and a modern web browser",
    inLanguage: "en",
    isAccessibleForFree: true,
    featureList: tool.features,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    datePublished: tool.datePublished,
    dateModified: tool.dateModified,
    author: {
      "@type": "Person",
      name: SITE.owner.name,
    },
    publisher: { "@id": ORG_ID },
  };
}

export function itemListSchema(name: string, items: { name: string; path: string }[]): Json {
  return {
    "@context": CTX,
    "@type": "ItemList",
    name,
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      url: absoluteUrl(it.path),
    })),
  };
}

export function collectionPageSchema(
  category: Category,
  items: { name: string; path: string }[],
): Json {
  const url = absoluteUrl(`/category/${category.slug}`);
  return {
    "@context": CTX,
    "@type": "CollectionPage",
    "@id": url,
    url,
    name: category.name,
    description: category.description,
    isPartOf: { "@id": `${SITE.url}/#website` },
    mainEntity: itemListSchema(category.name, items),
  };
}

export function webPageSchema(opts: {
  name: string;
  description: string;
  path: string;
  type?: "WebPage" | "AboutPage" | "ContactPage";
  modified?: string;
}): Json {
  const url = absoluteUrl(opts.path);
  return {
    "@context": CTX,
    "@type": opts.type ?? "WebPage",
    "@id": url,
    url,
    name: opts.name,
    description: opts.description,
    inLanguage: "en",
    dateModified: opts.modified,
    isPartOf: { "@id": `${SITE.url}/#website` },
    publisher: { "@id": ORG_ID },
  };
}
