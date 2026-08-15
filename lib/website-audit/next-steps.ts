/**
 * Maps public website-audit category scores to capability / proof next steps.
 * Does not change analyzer or scoring — presentation only.
 */

export type AuditCategoryKey =
  | "performance"
  | "seo"
  | "mobile"
  | "conversion"
  | "brand";

export type AuditCategoryInsight = {
  key: AuditCategoryKey;
  label: string;
  score: number;
  whyItMatters: string;
  problemCategory: string;
};

export type AuditCapabilityLink = {
  href: string;
  title: string;
  note: string;
};

export type AuditProofLink = {
  slug: string;
  title: string;
  note: string;
};

export type AuditNextSteps = {
  categories: AuditCategoryInsight[];
  weakest: AuditCategoryInsight[];
  capabilities: AuditCapabilityLink[];
  proof: AuditProofLink[];
  summary: string;
};

const CATEGORY_META: Record<
  AuditCategoryKey,
  { label: string; whyItMatters: string; problemCategory: string }
> = {
  performance: {
    label: "Performance",
    whyItMatters:
      "Slow or heavy pages erode trust before the message lands — especially on mobile.",
    problemCategory: "Technical / site quality",
  },
  seo: {
    label: "SEO",
    whyItMatters:
      "Weak titles, metadata, and hierarchy make it harder for the right visitors to find you.",
    problemCategory: "Visibility / discoverability",
  },
  mobile: {
    label: "Mobile",
    whyItMatters:
      "Most first visits happen on phones. Friction here quietly kills qualified interest.",
    problemCategory: "Customer experience",
  },
  conversion: {
    label: "Conversion",
    whyItMatters:
      "If inquiry paths are unclear, attention never becomes a conversation.",
    problemCategory: "Inquiry / conversion pathways",
  },
  brand: {
    label: "Brand",
    whyItMatters:
      "Presentation signals seriousness. Weak polish makes strong businesses look interchangeable.",
    problemCategory: "Presence / positioning",
  },
};

const WEAK_THRESHOLD = 70;

export function buildAuditNextSteps(scores: {
  performanceScore: number;
  seoScore: number;
  mobileScore: number;
  conversionScore: number;
  brandScore: number;
  overallScore: number;
}): AuditNextSteps {
  const categories: AuditCategoryInsight[] = (
    [
      ["performance", scores.performanceScore],
      ["seo", scores.seoScore],
      ["mobile", scores.mobileScore],
      ["conversion", scores.conversionScore],
      ["brand", scores.brandScore],
    ] as const
  ).map(([key, score]) => ({
    key,
    label: CATEGORY_META[key].label,
    score,
    whyItMatters: CATEGORY_META[key].whyItMatters,
    problemCategory: CATEGORY_META[key].problemCategory,
  }));

  const rankedWeakest = [...categories].sort((a, b) => a.score - b.score);
  const weakest = rankedWeakest
    .slice(0, 2)
    .filter((c) => c.score < WEAK_THRESHOLD || scores.overallScore < 75);

  const focusCategories =
    weakest.length > 0 ? weakest : [rankedWeakest[0]].filter(Boolean);

  const weakKeys = new Set(focusCategories.map((c) => c.key));

  const capabilities: AuditCapabilityLink[] = [];
  const proof: AuditProofLink[] = [];

  const presenceWeak =
    weakKeys.has("brand") ||
    weakKeys.has("conversion") ||
    weakKeys.has("mobile") ||
    weakKeys.has("performance");
  const growthWeak = weakKeys.has("seo") || weakKeys.has("conversion");

  if (presenceWeak) {
    capabilities.push({
      href: "/services/luxury-website-experiences",
      title: "Website Experiences",
      note: "Redesign and rebuild work for sites that no longer represent the business or convert interest cleanly.",
    });
    proof.push({
      slug: "primal-motorsports",
      title: "Primal Motorsports",
      note: "Flagship presence rebuilt to hold weight with serious buyers.",
    });
    proof.push({
      slug: "martinsen-construction",
      title: "Martinsen Construction",
      note: "Contractor website built for credibility and inquiry readiness.",
    });
  }

  if (growthWeak) {
    capabilities.push({
      href: "/services/growth-infrastructure",
      title: "Growth Infrastructure",
      note: "Visibility, measurement, and conversion pathways when traffic or inquiry structure is the bottleneck.",
    });
    if (!proof.some((p) => p.slug === "martinsen-construction")) {
      proof.push({
        slug: "martinsen-construction",
        title: "Martinsen Construction",
        note: "Service pathways structured for clearer demand.",
      });
    }
    proof.push({
      slug: "autodv8ions",
      title: "AutoDV8ions",
      note: "Automotive presence shaped to filter for qualified interest.",
    });
  }

  // Cap proof; never auto-push enterprise platforms from homepage-signal audits.
  const cappedProof = proof.slice(0, 2);
  const cappedCapabilities = capabilities.slice(0, 2);

  const focusLabels =
    focusCategories.length > 0
      ? focusCategories.map((w) => w.problemCategory.toLowerCase()).join(" and ")
      : "overall site quality";

  const summary =
    scores.overallScore >= 80
      ? "The foundation is relatively strong. The useful next step is refining the weakest pathways — not starting from zero."
      : `The clearest pressure shows up around ${focusLabels}. That is usually where a redesign, stronger inquiry architecture, or growth infrastructure creates the most leverage.`;

  return {
    categories,
    weakest: focusCategories,
    capabilities: cappedCapabilities,
    proof: cappedProof,
    summary,
  };
}

export function buildIntelligenceStartProjectHref(input: {
  auditId: number | string;
  website: string;
  company?: string | null;
  grade: string;
  overallScore: number;
}): string {
  const params = new URLSearchParams({
    source: "kxd-intelligence",
    auditId: String(input.auditId),
    website: input.website,
    grade: input.grade,
    score: String(input.overallScore),
  });
  if (input.company) params.set("company", input.company);
  return `/start-project?${params.toString()}`;
}
