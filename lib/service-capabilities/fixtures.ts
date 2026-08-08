/**
 * Generic commercial-scope fixture shaped like a premium website + inventory
 * growth engagement. Not bound to any client slug or operator name.
 *
 * Included because they are commercially distinct:
 * - managed_website — site care / review / requests
 * - seo_visibility — search/indexing (also grants analytics surface)
 * - inventory_experience — listings in commercial scope
 * - lead_conversion — landing + lead/financing infrastructure (one capability)
 * - growth_strategy — retained partnership / executive review
 * - hosting_infrastructure — platform hosting sold with managed site care
 *
 * Explicitly not included:
 * - analytics_reporting — no separate reporting retainer line; SEO already grants analytics
 * - google_ads_management / active_growth_campaign — add-ons, not in baseline
 * - performance_component — money/obligation only; present but does not affect CES
 */
import type { ClientServiceAssignmentRecord, ServiceCapabilityId } from "./types";

const ACTIVE_IDS: readonly ServiceCapabilityId[] = [
  "managed_website",
  "inventory_experience",
  "seo_visibility",
  "lead_conversion",
  "growth_strategy",
  "hosting_infrastructure",
];

export const GROWTH_INFRASTRUCTURE_SHOWROOM_SCOPE: {
  activeCapabilityIds: readonly ServiceCapabilityId[];
  inactiveAddOnIds: readonly ServiceCapabilityId[];
  performanceIds: readonly ServiceCapabilityId[];
  assignments: ClientServiceAssignmentRecord[];
} = {
  activeCapabilityIds: ACTIVE_IDS,
  inactiveAddOnIds: ["google_ads_management", "active_growth_campaign"],
  performanceIds: ["performance_component"],
  assignments: [
    ...ACTIVE_IDS.map((capabilityId, index) => ({
      id: index + 1,
      clientId: 0,
      capabilityId,
      source: "legacy-manual" as const,
      status: "active" as const,
      effectiveAt: "2026-01-01T00:00:00.000Z",
      endedAt: null,
      relatedContractId: null,
      note: null,
    })),
    {
      id: 90,
      clientId: 0,
      capabilityId: "performance_component",
      source: "agreement",
      status: "active",
      effectiveAt: "2026-01-01T00:00:00.000Z",
      endedAt: null,
      relatedContractId: null,
      note: "Commercial performance obligation only.",
    },
    {
      id: 91,
      clientId: 0,
      capabilityId: "google_ads_management",
      source: "add-on",
      status: "ended",
      effectiveAt: "2025-06-01T00:00:00.000Z",
      endedAt: "2025-12-01T00:00:00.000Z",
      relatedContractId: null,
      note: "Historical add-on. Must not grant future entitlement.",
    },
  ],
};
