import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { DEFAULT_OG_IMAGE } from "./site";

export type SeoInput = {
  title?: string;
  description?: string;
  path?: string;
  keywords?: string[];
  noIndex?: boolean;
  ogImage?: string;
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
};

export function absoluteUrl(path = "/"): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SITE.url}${normalized}`;
}

export function buildMetadata(input: SeoInput = {}): Metadata {
  const title = input.title
    ? `${input.title} · ${SITE.shortName}`
    : `${SITE.shortName} · Luxury Digital Experiences & Infrastructure`;

  const description = input.description || SITE.description;
  const path = input.path || "/";
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const canonicalUrl = absoluteUrl(normalizedPath);
  const ogImage = absoluteUrl(input.ogImage || DEFAULT_OG_IMAGE);

  return {
    metadataBase: new URL(SITE.url),
    title,
    description,
    keywords: input.keywords,
    alternates: {
      // Path-only canonical — never includes request query strings (e.g. /contact?service=…).
      canonical: normalizedPath,
    },
    robots: input.noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      type: input.type || "website",
      locale: SITE.locale,
      url: canonicalUrl,
      siteName: SITE.name,
      title,
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: SITE.name }],
      ...(input.publishedTime ? { publishedTime: input.publishedTime } : {}),
      ...(input.modifiedTime ? { modifiedTime: input.modifiedTime } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    verification: {
      google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    },
  };
}
