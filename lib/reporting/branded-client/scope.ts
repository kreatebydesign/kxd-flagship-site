/**
 * Retainer-aware report scope. Fail closed on premium sections.
 * Never infer paid scope from a connected integration alone.
 */

import type { ReportingCapabilityId } from "@/lib/reporting/domain";
import {
  REPORT_SCOPE_CAPABILITIES,
  reportingCapabilityToScope,
  type BrandedReportScopeDecision,
  type OutOfScopeOpportunity,
  type ReportScopeCapability,
} from "./types";

const SCOPE_SET = new Set<string>(REPORT_SCOPE_CAPABILITIES);

export function isReportScopeCapability(value: unknown): value is ReportScopeCapability {
  return typeof value === "string" && SCOPE_SET.has(value);
}

/**
 * Resolve included report capabilities.
 * Operator-confirmed overrides experience-profile only when explicitly provided.
 * Missing/ambiguous → fail closed to base-website only when reporting is enabled,
 * otherwise empty.
 */
export function resolveReportScope(input: {
  reportingEnabled: boolean;
  experienceCapabilities: readonly ReportingCapabilityId[];
  operatorConfirmedCapabilities?: readonly ReportScopeCapability[] | null;
  confirmedBy?: string | null;
  confirmedAt?: string | null;
  notes?: string | null;
}): BrandedReportScopeDecision {
  if (!input.reportingEnabled) {
    return {
      includedCapabilities: [],
      source: "fail-closed",
      confirmedBy: null,
      confirmedAt: null,
      notes: "Reporting is not enabled for this client.",
    };
  }

  if (
    input.operatorConfirmedCapabilities &&
    input.operatorConfirmedCapabilities.length > 0
  ) {
    const included = uniqueScopes(input.operatorConfirmedCapabilities);
    return {
      includedCapabilities: included,
      source: "operator-confirmed",
      confirmedBy: input.confirmedBy ?? null,
      confirmedAt: input.confirmedAt ?? null,
      notes: input.notes ?? null,
    };
  }

  const fromProfile = uniqueScopes(
    input.experienceCapabilities
      .map(reportingCapabilityToScope)
      .filter((v): v is ReportScopeCapability => v != null),
  );

  if (fromProfile.length === 0) {
    // Fail closed: base website management narrative only (no analytics claims).
    return {
      includedCapabilities: ["base-website"],
      source: "fail-closed",
      confirmedBy: null,
      confirmedAt: null,
      notes:
        "Service scope was missing or ambiguous. Premium analytics sections remain locked until an operator confirms capabilities.",
    };
  }

  // Always include base-website when any entitled scope exists.
  if (!fromProfile.includes("base-website")) {
    fromProfile.unshift("base-website");
  }

  return {
    includedCapabilities: fromProfile,
    source: "experience-profile",
    confirmedBy: null,
    confirmedAt: null,
    notes: null,
  };
}

export function scopeIncludes(
  scope: BrandedReportScopeDecision,
  capability: ReportScopeCapability,
): boolean {
  return scope.includedCapabilities.includes(capability);
}

export function buildOutOfScopeOpportunities(
  scope: BrandedReportScopeDecision,
): OutOfScopeOpportunity[] {
  const included = new Set(scope.includedCapabilities);
  const opportunities: OutOfScopeOpportunity[] = [];

  if (!included.has("seo")) {
    opportunities.push({
      capability: "seo",
      title: "SEO management visibility",
      summary:
        "Organic search performance, query movement, and prioritized SEO recommendations are available when SEO management is included in the retainer.",
      upgradeFraming:
        "Optional upgrade — not included in the current report scope and not promised as completed work.",
    });
  }

  if (!included.has("google-ads")) {
    opportunities.push({
      capability: "google-ads",
      title: "Google Ads management reporting",
      summary:
        "Paid search spend, conversion efficiency, and campaign observations are available when Google Ads management is included.",
      upgradeFraming:
        "Optional upgrade — not included in the current report scope and not promised as completed work.",
    });
  }

  if (!included.has("premium-partnership")) {
    opportunities.push({
      capability: "premium-partnership",
      title: "Premium partnership reporting",
      summary:
        "Cross-channel executive analysis, strategic roadmap, and deeper growth planning are available under premium/partnership reporting.",
      upgradeFraming:
        "Optional upgrade — not included in the current report scope and not promised as completed work.",
    });
  }

  return opportunities;
}

function uniqueScopes(
  values: readonly ReportScopeCapability[],
): ReportScopeCapability[] {
  const order = REPORT_SCOPE_CAPABILITIES;
  const set = new Set(values.filter(isReportScopeCapability));
  return order.filter((id) => set.has(id));
}
