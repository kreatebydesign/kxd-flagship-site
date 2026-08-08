import type { PortalModuleId } from "@/lib/ces/modules/canonical";
import type { ReportingCapabilityId } from "@/lib/reporting/domain/capabilities";

export const SERVICE_CAPABILITY_IDS = [
  "managed_website",
  "seo_visibility",
  "analytics_reporting",
  "inventory_experience",
  "growth_strategy",
  "hosting_infrastructure",
  "lead_conversion",
  "google_ads_management",
  "active_growth_campaign",
  "performance_component",
] as const;

export type ServiceCapabilityId = (typeof SERVICE_CAPABILITY_IDS)[number];

export type ServiceCapabilityKind = "included" | "add-on" | "performance";

export type ServiceAssignmentSource = "agreement" | "legacy-manual" | "included" | "add-on";

export type ServiceAssignmentStatus = "active" | "ended" | "expired";

export type ServiceCapabilityDefinition = {
  id: ServiceCapabilityId;
  label: string;
  summary: string;
  kind: ServiceCapabilityKind;
  grantsModules: readonly PortalModuleId[];
  grantsReporting: readonly ReportingCapabilityId[];
  /** When false, commercial truth only — never drives CES modules. */
  affectsExperience: boolean;
};

export type ClientServiceAssignmentRecord = {
  id: number | null;
  clientId: number;
  capabilityId: ServiceCapabilityId;
  source: ServiceAssignmentSource;
  status: ServiceAssignmentStatus;
  effectiveAt: string | null;
  endedAt: string | null;
  relatedContractId: number | null;
  note: string | null;
};

export type ResolvedServiceScope = {
  hasAuthoritativeScope: boolean;
  relationshipLabel: string | null;
  activeCapabilityIds: ServiceCapabilityId[];
  grantedModules: PortalModuleId[];
  grantedReporting: ReportingCapabilityId[];
  assignments: ClientServiceAssignmentRecord[];
};
