/**
 * Phase 29B — Reporting capability gating.
 * Modular domains. Never invent numbers when disabled or disconnected.
 */

import type { BusinessDomain, ReportingConfidence, ReportingFreshness } from "./types";

export type ReportingCapabilityId =
  | "website-analytics"
  | "google-ads"
  | "seo"
  | "gbp"
  | "stripe"
  | "meta"
  | "clarity"
  | "crm"
  | "call-tracking"
  | "executive-reporting";

export const REPORTING_CAPABILITY_DOMAIN: Record<
  Exclude<ReportingCapabilityId, "executive-reporting">,
  BusinessDomain
> = {
  "website-analytics": "website",
  "google-ads": "marketing",
  seo: "search",
  gbp: "experience",
  stripe: "financial",
  meta: "marketing",
  clarity: "website",
  crm: "sales",
  "call-tracking": "sales",
};

export const ALL_REPORTING_CAPABILITIES: ReportingCapabilityId[] = [
  "website-analytics",
  "google-ads",
  "seo",
  "gbp",
  "stripe",
  "meta",
  "clarity",
  "crm",
  "call-tracking",
  "executive-reporting",
];

export function domainsForCapabilities(
  enabled: readonly ReportingCapabilityId[],
): BusinessDomain[] {
  const domains = new Set<BusinessDomain>();
  for (const id of enabled) {
    if (id === "executive-reporting") continue;
    domains.add(REPORTING_CAPABILITY_DOMAIN[id]);
  }
  return Array.from(domains);
}

export function isDomainEnabled(
  domain: BusinessDomain,
  enabled: readonly ReportingCapabilityId[],
): boolean {
  if (domain === "overall") return enabled.length > 0;
  return domainsForCapabilities(enabled).includes(domain);
}

export function filterFactsByCapabilities<T extends { domain: BusinessDomain }>(
  facts: T[],
  enabled: readonly ReportingCapabilityId[],
): T[] {
  const allowed = new Set(domainsForCapabilities(enabled));
  return facts.filter((fact) => allowed.has(fact.domain));
}

/** Disconnected provider → unknown confidence, missing freshness. */
export function disconnectedSourceMeta(): {
  freshness: ReportingFreshness;
  confidence: ReportingConfidence;
} {
  return { freshness: "missing", confidence: "unknown" };
}
