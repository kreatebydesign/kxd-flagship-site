import { SITE } from "@/lib/site";
import { DEFAULT_OG_IMAGE } from "./site";
import { absoluteUrl } from "./metadata";

export function organizationSchema(reviews?: {
  authorName: string;
  rating: number;
  reviewText: string;
  reviewDate: string;
}[]) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE.url}/#organization`,
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    description: SITE.description,
    email: SITE.email,
    foundingDate: String(SITE.foundedYear),
    sameAs: Object.values(SITE.social),
    logo: absoluteUrl(DEFAULT_OG_IMAGE),
  };

  if (reviews?.length) {
    const ratings = reviews.map((review) => review.rating);

    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: (
        ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
      ).toFixed(1),
      reviewCount: reviews.length,
      bestRating: 5,
      worstRating: 1,
    };

    schema.review = reviews.map((review) => ({
      "@type": "Review",
      author: {
        "@type": "Person",
        name: review.authorName,
      },
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
      reviewBody: review.reviewText,
      datePublished: review.reviewDate,
    }));
  }

  return schema;
}

export function localBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${SITE.url}/#localbusiness`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    email: SITE.email,
    priceRange: "$$$$",
    areaServed: [
      { "@type": "City", name: "Los Angeles" },
      { "@type": "State", name: "California" },
      { "@type": "Country", name: "United States" },
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: SITE.address.addressLocality,
      addressRegion: SITE.address.addressRegion,
      addressCountry: SITE.address.addressCountry,
    },
    parentOrganization: {
      "@id": `${SITE.url}/#organization`,
    },
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    name: SITE.name,
    url: SITE.url,
    publisher: {
      "@id": `${SITE.url}/#organization`,
    },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/**
 * Deprecated compatibility helper.
 * Reviews should be passed into organizationSchema(reviews) so the homepage
 * only outputs one Organization object with one stable @id.
 */
export function reviewSchema(reviews: {
  authorName: string;
  rating: number;
  reviewText: string;
  reviewDate: string;
}[]) {
  if (!reviews.length) return null;

  return organizationSchema(reviews);
}

export function blogPostingSchema(input: {
  title: string;
  description: string;
  path: string;
  publishedAt: string;
  modifiedAt?: string;
  authorName?: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    datePublished: input.publishedAt,
    dateModified: input.modifiedAt || input.publishedAt,
    author: {
      "@type": "Person",
      name: input.authorName || SITE.name,
    },
    publisher: {
      "@id": `${SITE.url}/#organization`,
    },
    image: input.image ? absoluteUrl(input.image) : undefined,
    mainEntityOfPage: absoluteUrl(input.path),
  };
}

export function caseStudySchema(input: {
  title: string;
  description: string;
  path: string;
  client: string;
  industry: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    about: input.client,
    articleSection: input.industry,
    image: input.image ? absoluteUrl(input.image) : undefined,
    publisher: {
      "@id": `${SITE.url}/#organization`,
    },
  };
}

export function serviceSchema(input: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    provider: {
      "@id": `${SITE.url}/#organization`,
    },
    areaServed: {
      "@type": "Country",
      name: "United States",
    },
  };
}

export function webPageSchema(input: {
  title: string;
  description: string;
  path: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: input.title,
    description: input.description,
    url: absoluteUrl(input.path),
    isPartOf: {
      "@id": `${SITE.url}/#website`,
    },
    publisher: {
      "@id": `${SITE.url}/#organization`,
    },
  };
}

export function itemListSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}