import type { MetadataRoute } from "next";
import { absoluteUrl, LEGAL_UPDATED_ISO } from "@/lib/site";
import { getActiveCategories, getAllTools } from "@/lib/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  const tools = getAllTools();
  const newest = tools.reduce(
    (max, t) => (t.dateModified > max ? t.dateModified : max),
    LEGAL_UPDATED_ISO,
  );

  const entries: MetadataRoute.Sitemap = [
    {
      url: absoluteUrl("/"),
      lastModified: newest,
      changeFrequency: "daily",
      priority: 1,
    },
    ...getActiveCategories().map((c) => ({
      url: absoluteUrl(`/category/${c.slug}`),
      lastModified: newest,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...tools.map((t) => ({
      url: absoluteUrl(`/tools/${t.slug}`),
      lastModified: t.dateModified,
      changeFrequency: "monthly" as const,
      priority: 0.9,
    })),
    ...["/about", "/contact"].map((p) => ({
      url: absoluteUrl(p),
      lastModified: LEGAL_UPDATED_ISO,
      changeFrequency: "yearly" as const,
      priority: 0.5,
    })),
    ...["/privacy-policy", "/terms-and-conditions", "/disclaimer"].map((p) => ({
      url: absoluteUrl(p),
      lastModified: LEGAL_UPDATED_ISO,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ];

  return entries;
}
