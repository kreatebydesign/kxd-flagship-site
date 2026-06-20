/**
 * lib/website-audit/analyzer.ts
 * Lean HTML-based website audit — no crawler infrastructure.
 * Fetches a single page and scores key signals for lead qualification.
 */

import { calculateOverallScore, clampScore, type CategoryScores } from "./scoring.ts";

export type AuditInsight = {
  strengths: string[];
  opportunities: string[];
  recommendations: string[];
};

export type WebsiteAuditResult = CategoryScores & {
  overallScore: number;
  grade: string;
  strengths: string[];
  opportunities: string[];
  recommendations: string[];
  websiteUrl: string;
};

function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Website URL is required.");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function extractBetween(html: string, pattern: RegExp): string | null {
  const m = html.match(pattern);
  return m?.[1]?.trim() ?? null;
}

function countMatches(html: string, pattern: RegExp): number {
  return (html.match(pattern) ?? []).length;
}

function linesToText(lines: string[]): string {
  return lines.join("\n");
}

export async function runWebsiteAudit(websiteInput: string): Promise<WebsiteAuditResult> {
  const websiteUrl = normalizeUrl(websiteInput);
  const start = Date.now();

  const res = await fetch(websiteUrl, {
    headers: {
      "User-Agent": "KXD-Website-Auditor/1.0 (+https://kreatebydesign.com)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(18_000),
    redirect: "follow",
  });

  const responseMs = Date.now() - start;
  const html = await res.text();
  const htmlLower = html.toLowerCase();
  const pageSizeKb = Math.round(html.length / 1024);

  const strengths: string[] = [];
  const opportunities: string[] = [];
  const recommendations: string[] = [];

  // ── Performance ─────────────────────────────────────────────────────────────
  let performanceScore = 70;
  if (responseMs < 600) performanceScore += 20;
  else if (responseMs < 1200) performanceScore += 12;
  else if (responseMs < 2500) performanceScore += 4;
  else {
    performanceScore -= 15;
    opportunities.push("Page response time is slow — visitors may abandon before content loads.");
    recommendations.push("Optimize hosting, caching, and image delivery to improve load speed.");
  }

  if (pageSizeKb < 400) performanceScore += 8;
  else if (pageSizeKb > 900) {
    performanceScore -= 12;
    opportunities.push("Page payload is heavy — large HTML/asset weight slows first paint.");
    recommendations.push("Compress images, defer non-critical scripts, and audit third-party embeds.");
  } else if (pageSizeKb > 600) {
    performanceScore -= 5;
  }

  const scriptCount = countMatches(htmlLower, /<script/g);
  if (scriptCount > 25) {
    performanceScore -= 8;
    opportunities.push("High script count detected — can delay interactivity on mobile.");
  } else if (scriptCount < 12) {
    performanceScore += 4;
    strengths.push("Relatively lean script footprint supports faster load.");
  }

  if (res.ok) strengths.push("Website responded successfully at audit time.");
  else {
    performanceScore -= 20;
    opportunities.push(`HTTP status ${res.status} — site may be unreachable or misconfigured.`);
  }

  // ── SEO ───────────────────────────────────────────────────────────────────
  let seoScore = 55;
  const title = extractBetween(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const metaDesc = extractBetween(
    html,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  ) ?? extractBetween(
    html,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
  );

  if (title && title.length >= 20 && title.length <= 65) {
    seoScore += 18;
    strengths.push("Page title is present and within a strong SEO length range.");
  } else if (title) {
    seoScore += 8;
    opportunities.push("Page title length is outside the ideal range for search visibility.");
  } else {
    seoScore -= 15;
    opportunities.push("Missing or empty page title — critical for search indexing.");
    recommendations.push("Define a clear, keyword-aligned title tag for every key page.");
  }

  if (metaDesc && metaDesc.length >= 70 && metaDesc.length <= 165) {
    seoScore += 16;
    strengths.push("Meta description supports search snippet quality.");
  } else if (metaDesc) {
    seoScore += 6;
    opportunities.push("Meta description could be refined for stronger search click-through.");
  } else {
    seoScore -= 10;
    opportunities.push("No meta description found — search results may underperform.");
    recommendations.push("Add a compelling meta description aligned to your primary service.");
  }

  const h1Count = countMatches(htmlLower, /<h1[\s>]/g);
  if (h1Count === 1) {
    seoScore += 12;
    strengths.push("Single H1 structure supports clear topical hierarchy.");
  } else if (h1Count === 0) {
    seoScore -= 12;
    opportunities.push("No H1 detected — page hierarchy is unclear to search engines.");
  } else {
    seoScore -= 6;
    opportunities.push("Multiple H1 tags detected — dilutes primary page focus for SEO.");
  }

  if (htmlLower.includes('rel="canonical"') || htmlLower.includes("rel='canonical'")) {
    seoScore += 6;
    strengths.push("Canonical tag present — helps prevent duplicate indexing issues.");
  } else {
    opportunities.push("Canonical URL not detected — duplicate URLs may compete in search.");
  }

  if (htmlLower.includes("og:title") || htmlLower.includes("og:description")) {
    seoScore += 6;
    strengths.push("Open Graph metadata supports richer social sharing.");
  }

  // ── Mobile ────────────────────────────────────────────────────────────────
  let mobileScore = 50;
  const hasViewport = htmlLower.includes('name="viewport"') || htmlLower.includes("name='viewport'");
  if (hasViewport) {
    mobileScore += 22;
    strengths.push("Viewport meta tag configured for mobile rendering.");
  } else {
    mobileScore -= 20;
    opportunities.push("Missing viewport meta — mobile layout likely broken or scaled poorly.");
    recommendations.push("Add a responsive viewport meta tag and validate mobile breakpoints.");
  }

  if (!htmlLower.includes("width=") || htmlLower.includes("max-width")) {
    mobileScore += 8;
  } else if (htmlLower.match(/width:\s*\d{3,}px/)) {
    mobileScore -= 10;
    opportunities.push("Fixed-width layout patterns detected — may break on small screens.");
  }

  const touchTargets = countMatches(htmlLower, /<a[\s>]/g) + countMatches(htmlLower, /<button/g);
  if (touchTargets >= 3) mobileScore += 8;
  else {
    opportunities.push("Limited interactive elements — mobile users may struggle to take action.");
  }

  if (htmlLower.includes("tel:")) {
    mobileScore += 6;
    strengths.push("Click-to-call link supports mobile lead capture.");
  }

  // ── Conversion ──────────────────────────────────────────────────────────
  let conversionScore = 45;
  const ctaPatterns = [
    "book", "schedule", "contact", "get started", "start project", "apply",
    "request", "call", "consultation", "strategy",
  ];
  const ctaHits = ctaPatterns.filter((p) => htmlLower.includes(p)).length;

  if (ctaHits >= 3) {
    conversionScore += 22;
    strengths.push("Clear conversion language present across the page.");
  } else if (ctaHits >= 1) {
    conversionScore += 10;
    opportunities.push("Conversion language is present but could be stronger and more focused.");
  } else {
    conversionScore -= 10;
    opportunities.push("Weak conversion signals — visitors may not know the next step.");
    recommendations.push("Add a primary CTA above the fold with one clear action.");
  }

  const formCount = countMatches(htmlLower, /<form/g);
  if (formCount > 0) {
    conversionScore += 14;
    strengths.push("Lead capture form detected on the page.");
  } else {
    opportunities.push("No form detected — missed opportunity for direct lead capture.");
    recommendations.push("Introduce a focused inquiry or booking form on high-intent pages.");
  }

  if (htmlLower.includes("mailto:")) conversionScore += 6;
  if (htmlLower.includes("calendly") || htmlLower.includes("hubspot")) {
    conversionScore += 8;
    strengths.push("Scheduling or CRM integration supports conversion workflow.");
  }

  // ── Brand ───────────────────────────────────────────────────────────────
  let brandScore = 50;
  if (htmlLower.includes("favicon") || htmlLower.includes("rel=\"icon\"")) {
    brandScore += 10;
    strengths.push("Favicon present — supports brand recognition in browser tabs.");
  } else {
    opportunities.push("No favicon detected — small but visible brand gap.");
  }

  if (htmlLower.includes("fonts.googleapis") || htmlLower.includes("@font-face")) {
    brandScore += 12;
    strengths.push("Custom typography signals intentional brand presentation.");
  } else {
    opportunities.push("Limited custom typography — brand may feel generic.");
    recommendations.push("Define a premium type system aligned to your brand positioning.");
  }

  const logoSignals = countMatches(htmlLower, /logo/g) + countMatches(htmlLower, /<img[^>]+alt=["'][^"']*logo/i);
  if (logoSignals >= 2) {
    brandScore += 10;
    strengths.push("Logo presence supports immediate brand recognition.");
  } else {
    opportunities.push("Logo visibility is weak — brand may not register quickly.");
  }

  if (title && companyNameInTitle(title, websiteUrl)) brandScore += 6;

  const inlineStyleDensity = countMatches(htmlLower, /style="/g);
  if (inlineStyleDensity > 40) {
    brandScore -= 8;
    opportunities.push("Heavy inline styling — design system may lack consistency.");
  } else if (inlineStyleDensity < 15) {
    brandScore += 6;
  }

  // ── Finalize scores ───────────────────────────────────────────────────────
  const categoryScores: CategoryScores = {
    performanceScore: clampScore(performanceScore),
    seoScore: clampScore(seoScore),
    mobileScore: clampScore(mobileScore),
    conversionScore: clampScore(conversionScore),
    brandScore: clampScore(brandScore),
  };

  const weighted = calculateOverallScore(categoryScores);

  if (weighted.overallScore < 75 && !recommendations.some((r) => r.includes("CTA"))) {
    recommendations.push("Clarify one primary conversion path — book, apply, or contact — across hero and footer.");
  }
  if (weighted.seoScore < 70) {
    recommendations.push("Audit core SEO foundations: titles, meta descriptions, headings, and indexability.");
  }
  if (weighted.mobileScore < 75) {
    recommendations.push("Run a dedicated mobile UX review — most visitors will experience you on a phone first.");
  }
  if (weighted.brandScore < 70) {
    recommendations.push("Elevate visual identity — typography, imagery, and layout should match your market position.");
  }
  if (strengths.length === 0) {
    strengths.push("Website is live and auditable — foundation exists for strategic improvement.");
  }
  if (opportunities.length === 0) {
    opportunities.push("Fine-tune messaging hierarchy and conversion paths for premium buyer confidence.");
  }

  return {
    ...weighted,
    strengths: strengths.slice(0, 6),
    opportunities: opportunities.slice(0, 6),
    recommendations: recommendations.slice(0, 5),
    websiteUrl,
  };
}

function companyNameInTitle(title: string, url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").split(".")[0];
    return title.toLowerCase().includes(host.toLowerCase());
  } catch {
    return false;
  }
}

export function auditListsToPayload(insight: AuditInsight): {
  strengths: string;
  opportunities: string;
  recommendations: string;
} {
  return {
    strengths: linesToText(insight.strengths),
    opportunities: linesToText(insight.opportunities),
    recommendations: linesToText(insight.recommendations),
  };
}
