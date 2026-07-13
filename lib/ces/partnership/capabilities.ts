/**
 * Future client modules — presentation registry (labels / maturity).
 * Durable per-client entitlements live on Client Experience Profiles.enabledModules.
 * Reporting resolves IDs via getReportingCapabilityIds().
 *
 * Phase 29B — reporting capabilities added for modular domain gating.
 */

import type { PartnershipFutureModule, PartnershipModuleStatus } from "./types";
import {
  ALL_REPORTING_CAPABILITIES,
  type ReportingCapabilityId,
} from "@/lib/reporting/domain/capabilities";

const STATUS_LABEL: Record<PartnershipModuleStatus, string> = {
  planned: "Planned",
  "in-development": "In Development",
  "available-next": "Available Next",
};

export interface ClientCapabilityDefinition {
  id: string;
  label: string;
  status: PartnershipModuleStatus;
}

/**
 * Shared Core–ready capability map for client experiences.
 * Primal is the first consumer; other clients reuse the same registry.
 */
export const CLIENT_CAPABILITY_REGISTRY: ClientCapabilityDefinition[] = [
  { id: "overview", label: "Partnership Overview", status: "available-next" },
  { id: "website-review", label: "Website Review", status: "available-next" },
  { id: "analytics", label: "Analytics", status: "in-development" },
  { id: "website-analytics", label: "Website Analytics", status: "in-development" },
  { id: "google-ads", label: "Google Ads", status: "in-development" },
  { id: "seo", label: "SEO", status: "in-development" },
  { id: "gbp", label: "Google Business Profile", status: "planned" },
  { id: "stripe", label: "Stripe", status: "planned" },
  { id: "meta", label: "Meta", status: "planned" },
  { id: "clarity", label: "Microsoft Clarity", status: "planned" },
  { id: "crm", label: "CRM", status: "planned" },
  { id: "call-tracking", label: "Call Tracking", status: "planned" },
  { id: "executive-reporting", label: "Executive Reporting", status: "in-development" },
  { id: "billing", label: "Billing", status: "planned" },
  { id: "payments", label: "Payments", status: "planned" },
  { id: "brand-center", label: "Brand Center", status: "planned" },
  { id: "campaign-intelligence", label: "Campaign Intelligence", status: "in-development" },
  { id: "communications", label: "Communications", status: "planned" },
  { id: "deliverables", label: "Deliverables", status: "planned" },
  { id: "document-vault", label: "Document Vault", status: "planned" },
  { id: "meeting-notes", label: "Meeting Notes", status: "planned" },
  { id: "growth-recommendations", label: "Growth Recommendations", status: "in-development" },
  { id: "account-management", label: "Account Management", status: "planned" },
  { id: "projects", label: "Projects", status: "planned" },
  { id: "requests", label: "Requests", status: "planned" },
  { id: "files", label: "Files", status: "planned" },
  { id: "onboarding", label: "Onboarding", status: "planned" },
];

/** Board-facing subset — where the relationship is going. */
export const BOARD_FUTURE_MODULE_IDS = [
  "analytics",
  "website-analytics",
  "executive-reporting",
  "google-ads",
  "seo",
  "billing",
  "payments",
  "brand-center",
  "campaign-intelligence",
  "communications",
  "deliverables",
  "document-vault",
  "meeting-notes",
  "growth-recommendations",
  "account-management",
] as const;

export function getBoardFutureModules(): PartnershipFutureModule[] {
  return BOARD_FUTURE_MODULE_IDS.map((id) => {
    const def = CLIENT_CAPABILITY_REGISTRY.find((m) => m.id === id);
    const status = def?.status ?? "planned";
    return {
      id,
      label: def?.label ?? id,
      status,
      statusLabel: STATUS_LABEL[status],
    };
  });
}

/** Reporting capability IDs recognized by the reporting domain. */
export function getReportingCapabilityIds(
  enabledModuleIds: readonly string[],
): ReportingCapabilityId[] {
  const allowed = new Set<string>(ALL_REPORTING_CAPABILITIES);
  return enabledModuleIds.filter((id): id is ReportingCapabilityId => allowed.has(id));
}
