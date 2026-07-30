/**
 * Derive client-facing findings from stored auditor text lists.
 * Does not invent measurements — maps existing strengths/opportunities.
 */

import {
  type AuditFindingCategory,
  type DerivedFinding,
  type FindingSeverity,
  type ManualFinding,
} from "./types.ts";

function lines(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

function inferCategory(text: string): AuditFindingCategory {
  const t = text.toLowerCase();
  if (
    t.includes("viewport") ||
    t.includes("mobile") ||
    t.includes("touch") ||
    t.includes("phone") ||
    t.includes("click-to-call") ||
    t.includes("tel:")
  ) {
    return "mobile";
  }
  if (
    t.includes("title") ||
    t.includes("meta description") ||
    t.includes("meta ") ||
    t.includes("h1") ||
    t.includes("canonical") ||
    t.includes("seo") ||
    t.includes("search") ||
    t.includes("open graph")
  ) {
    return "seo";
  }
  if (
    t.includes("response time") ||
    t.includes("page payload") ||
    t.includes("payload is heavy") ||
    t.includes("script count") ||
    t.includes("script footprint") ||
    t.includes("caching") ||
    t.includes("image delivery") ||
    t.includes("hosting") ||
    t.includes("http status") ||
    t.includes("load speed") ||
    t.includes("first paint")
  ) {
    return "performance";
  }
  if (
    t.includes("cta") ||
    t.includes("conversion") ||
    t.includes("form") ||
    t.includes("lead") ||
    t.includes("book") ||
    t.includes("contact") ||
    t.includes("calendly") ||
    t.includes("scheduling")
  ) {
    return "conversion";
  }
  if (
    t.includes("brand") ||
    t.includes("favicon") ||
    t.includes("typography") ||
    t.includes("logo") ||
    t.includes("visual") ||
    t.includes("design")
  ) {
    return "brand";
  }
  return "general";
}

function strengthSeverity(): FindingSeverity {
  return "strength";
}

function opportunitySeverity(text: string): FindingSeverity {
  const t = text.toLowerCase();
  if (
    t.includes("missing") ||
    t.includes("critical") ||
    t.includes("unreachable") ||
    t.includes("broken") ||
    t.includes("http status")
  ) {
    return "priority";
  }
  if (t.includes("weak") || t.includes("slow") || t.includes("heavy") || t.includes("no form")) {
    return "attention";
  }
  return "info";
}

/** Prefer complete finding lines as headlines; truncate only at extreme length. */
function shortTitle(text: string, max = 160): string {
  const cleaned = text.replace(/\s+/g, " ").trim().replace(/\.$/, "");
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max - 1);
  const atWord = slice.lastIndexOf(" ");
  const base = atWord > max * 0.6 ? slice.slice(0, atWord) : slice;
  return `${base.trim()}…`;
}

function whyItMatters(category: AuditFindingCategory, isStrength: boolean): string {
  if (isStrength) {
    switch (category) {
      case "performance":
        return "Fast, reliable delivery protects attention and conversion.";
      case "seo":
        return "Search foundations help qualified visitors find the business.";
      case "mobile":
        return "Most first visits happen on a phone — mobile clarity builds trust.";
      case "conversion":
        return "Clear next steps turn interest into inquiries.";
      case "brand":
        return "Premium presentation signals credibility to discerning buyers.";
      default:
        return "This strength supports overall website effectiveness.";
    }
  }
  switch (category) {
    case "performance":
      return "Friction here causes visitors to leave before they understand the offer.";
    case "seo":
      return "Weak search foundations limit discovery of the right buyers.";
    case "mobile":
      return "A poor mobile experience reduces trust and follow-through.";
    case "conversion":
      return "Unclear action paths leave interested visitors without a next step.";
    case "brand":
      return "Inconsistent presentation weakens premium positioning.";
    default:
      return "Addressing this improves how the website supports the business.";
  }
}

export function deriveAutomatedFindings(source: {
  strengths?: string | null;
  opportunities?: string | null;
  recommendations?: string | null;
}): DerivedFinding[] {
  const recs = lines(source.recommendations);
  const findings: DerivedFinding[] = [];

  lines(source.strengths).forEach((text, index) => {
    const category = inferCategory(text);
    findings.push({
      id: `strength-${index}`,
      provenance: "automated",
      category,
      severity: strengthSeverity(),
      title: shortTitle(text),
      detected: text,
      whyItMatters: whyItMatters(category, true),
      evidence: "Observed on the public page during the KXD Website Audit",
      sourceKind: "strength",
      sourceIndex: index,
    });
  });

  lines(source.opportunities).forEach((text, index) => {
    const category = inferCategory(text);
    const matchedRec =
      recs.find((r) => inferCategory(r) === category) ??
      (recs[index] !== undefined ? recs[index] : undefined) ??
      recs[0];
    findings.push({
      id: `opportunity-${index}`,
      provenance: "automated",
      category,
      severity: opportunitySeverity(text),
      title: shortTitle(text),
      detected: text,
      whyItMatters: whyItMatters(category, false),
      evidence: "Observed on the public page during the KXD Website Audit",
      recommendedAction: matchedRec,
      sourceKind: "opportunity",
      sourceIndex: index,
    });
  });

  return findings;
}

export function manualFindingToDerived(finding: ManualFinding): DerivedFinding {
  return {
    id: finding.id,
    provenance: "manual",
    category: finding.category,
    severity: finding.severity,
    title: finding.title,
    detected: finding.observed,
    whyItMatters: finding.whyItMatters,
    recommendedAction: finding.recommendation,
    evidence: "Noted during KXD professional review",
    sourceKind: "manual",
  };
}

export function parseInsightLines(raw: string | null | undefined): string[] {
  return lines(raw);
}
