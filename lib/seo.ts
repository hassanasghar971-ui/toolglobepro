import type { Metadata } from "next";
import { SITE, absoluteUrl } from "./site";

export interface MetaInput {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  /** When true, the title is used as-is without the "| ToolGlobe Pro" suffix. */
  absoluteTitle?: boolean;
}

const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: SITE.name,
};

/** Every page is indexable. There is deliberately no noindex option. */
export function buildMetadata(input: MetaInput): Metadata {
  const fullTitle = input.absoluteTitle ? input.title : `${input.title} | ${SITE.name}`;
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    keywords: input.keywords,
    alternates: { canonical: input.path },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "website",
      url: absoluteUrl(input.path),
      siteName: SITE.name,
      locale: SITE.locale,
      title: fullTitle,
      description: input.description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: input.description,
      images: [OG_IMAGE.url],
    },
  };
}
