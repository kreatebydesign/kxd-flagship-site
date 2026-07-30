/**
 * Deterministic narrative generation from stored audit scores and insights.
 * No external AI. Future intelligence can replace generateAuditNarrative().
 */

import { CATEGORY_LABEL, type AuditFindingCategory, type GeneratedNarrative } from "./types.ts";
import { deriveAutomatedFindings, parseInsightLines } from "./findings.ts";
import type { AuditReportSource } from "./types.ts";
import { scoreConditionLabel } from "../kxd-report-engine/score-display.ts";

function rankCategories(source: AuditReportSource): {
  strongest: { key: AuditFindingCategory; score: number }[];
  weakest: { key: AuditFindingCategory; score: number }[];
} {
  const entries = (
    [
      { key: "performance" as const, score: Number(source.performanceScore ?? 0) },
      { key: "seo" as const, score: Number(source.seoScore ?? 0) },
      { key: "mobile" as const, score: Number(source.mobileScore ?? 0) },
      { key: "conversion" as const, score: Number(source.conversionScore ?? 0) },
      { key: "brand" as const, score: Number(source.brandScore ?? 0) },
    ] satisfies { key: AuditFindingCategory; score: number }[]
  ).filter((e) => !Number.isNaN(e.score));

  const sorted = [...entries].sort((a, b) => b.score - a.score);
  return {
    strongest: sorted.slice(0, 2),
    weakest: [...sorted].reverse().slice(0, 2),
  };
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Build a grounded first-draft narrative from persisted audit evidence.
 * Operator must review/edit before approval.
 */
export function generateAuditNarrative(source: AuditReportSource): GeneratedNarrative {
  const company = (source.company || source.name || "this business").trim();
  const domain = domainFromUrl(source.website);
  const overall = source.overallScore != null ? Number(source.overallScore) : null;
  const grade = source.grade ? String(source.grade) : null;
  const condition = scoreConditionLabel(overall)?.toLowerCase() ?? null;
  const { strongest, weakest } = rankCategories(source);
  const findings = deriveAutomatedFindings(source);
  const strengths = findings.filter((f) => f.sourceKind === "strength").slice(0, 3);
  const opportunities = findings.filter((f) => f.sourceKind === "opportunity").slice(0, 3);
  const recommendations = parseInsightLines(source.recommendations).slice(0, 4);

  const strongText = strongest
    .map((s) => `${CATEGORY_LABEL[s.key]} (${s.score})`)
    .join(" and ");
  const weakText = weakest
    .map((s) => `${CATEGORY_LABEL[s.key]} (${s.score})`)
    .join(" and ");

  const conditionLine =
    overall == null
      ? "This review captured directional signals from the public page HTML."
      : `Overall condition reads as ${condition ?? "directional"}${
          grade ? ` — Grade ${grade}, ${overall} / 100` : ` — ${overall} / 100`
        }.`;

  const executiveSummary = [
    `Kreate by Design reviewed ${domain} for ${company}. ${conditionLine}`,
    strongest.length
      ? `Measured strength concentrates in ${strongText}. Treat these as current HTML-pass signals, not a guarantee of ongoing performance.`
      : "Category strengths could not be ranked from the stored scores.",
    weakest.length
      ? `The sharpest opportunity sits in ${weakText}. Closing those gaps improves discovery, trust, and conversion support.`
      : "",
    "The pages that follow separate measured findings from KXD’s professional interpretation and recommended sequence of work.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const workingWell =
    strengths.length > 0
      ? [
          "Foundations already working in the client’s favor:",
          ...strengths.map((s) => `• ${s.detected}`),
        ].join("\n")
      : "The site is live and auditable. Specific automated strengths were limited in this pass — reinforce fundamentals that already support credibility.";

  const losingOpportunity =
    opportunities.length > 0
      ? [
          "Where the website is leaving value on the table:",
          ...opportunities.map((o) => `• ${o.detected}`),
        ].join("\n")
      : "No major automated opportunity signals were stored. A focused professional review can still surface conversion and messaging gaps the HTML pass cannot see.";

  const recommendedNextSteps =
    recommendations.length > 0
      ? [
          "KXD recommends concentrating effort in this order:",
          ...recommendations.map((r, i) => `${i + 1}. ${r}`),
        ].join("\n")
      : "1. Confirm primary conversion path above the fold.\n2. Strengthen SEO foundations on key pages.\n3. Validate mobile clarity and contact pathways.";

  const closingNote = `Prepared by Kreate by Design for ${company}. This Website Audit Report is a professional assessment based on the KXD Website Auditor snapshot for ${domain}. It is not a certification of accessibility, security, SEO completeness, or guaranteed business outcomes.`;

  return {
    reportTitle: `Website Audit — ${company}`,
    executiveSummary,
    workingWell,
    losingOpportunity,
    recommendedNextSteps,
    closingNote,
  };
}
