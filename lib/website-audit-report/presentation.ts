/**
 * Audit-report presentation helpers (domain-aware).
 * Shared format/score primitives come from KXD Report Engine.
 */

import type { CanonicalAuditReport, CanonicalFinding } from "./types.ts";
import {
  formatReportDomain,
  formatReportLongDate,
} from "../kxd-report-engine/format.ts";
import {
  formatGradeContext,
  formatScoreOutOf,
  scoreConditionLabel,
} from "../kxd-report-engine/score-display.ts";

export {
  formatReportDomain as domainLabel,
  formatReportLongDate as fmtLongDate,
  formatGradeContext,
  formatScoreOutOf,
  scoreConditionLabel,
};

/** Normalize whitespace for comparison. */
export function normalizeCopy(value: string): string {
  return value.replace(/\s+/g, " ").trim().replace(/\.$/, "").toLowerCase();
}

/**
 * Supporting context for a finding — omit when it only restates the headline.
 * If the headline was truncated, surface the full observed line as support.
 */
export function findingSupportCopy(finding: CanonicalFinding): string | null {
  const title = finding.title?.trim() || "";
  const detected = finding.detected?.trim() || "";
  if (!detected) return null;
  if (normalizeCopy(title) === normalizeCopy(detected)) return null;

  const titleCore = normalizeCopy(title).replace(/…$/, "").replace(/\.\.\.$/, "");
  const detectedNorm = normalizeCopy(detected);
  if (title && detectedNorm.startsWith(titleCore)) {
    if (/…$|\.\.\.$/.test(title.trim())) return detected;
    if (detectedNorm.length <= titleCore.length + 12) return null;
    return detected;
  }
  return detected;
}

export function findingProvenanceLabel(finding: CanonicalFinding): string {
  return finding.provenance === "manual" ? "Professional review" : "Audit evidence";
}

export function coverPrimaryName(report: CanonicalAuditReport): string {
  return report.companyName?.trim() || "Website Audit";
}

/**
 * Cover uses the company as the hero under a fixed document type.
 * Custom report titles are not repeated on the cover.
 */
export function coverDocumentType(): string {
  return "Website Audit Report";
}

export function severityLabel(severity: CanonicalFinding["severity"]): string {
  switch (severity) {
    case "strength":
      return "Strength";
    case "priority":
      return "Priority";
    case "attention":
      return "Needs attention";
    default:
      return "Observation";
  }
}

/** Cover subtitle intentionally unused — hierarchy is logo → type → client. */
export function coverSubtitle(_report?: CanonicalAuditReport): string | null {
  void _report;
  return null;
}
