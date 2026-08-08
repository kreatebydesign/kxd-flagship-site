import { isInternalOnlyCapability, type PortalModuleId } from "@/lib/ces/modules/canonical";
import type {
  ServiceCapabilityDefinition,
  ServiceCapabilityId,
} from "./types";
import { SERVICE_CAPABILITY_IDS } from "./types";

function modules(...ids: PortalModuleId[]): readonly PortalModuleId[] {
  for (const id of ids) {
    if (isInternalOnlyCapability(id) || id === "advisor") {
      throw new Error(`Service capabilities must not grant ${id}.`);
    }
  }
  return ids;
}

export const SERVICE_CAPABILITY_CATALOG: readonly ServiceCapabilityDefinition[] = [
  {
    id: "managed_website",
    label: "Managed Website",
    summary: "Website care, review, and client requests.",
    kind: "included",
    grantsModules: modules("website-workspace", "website-review", "website-health", "requests"),
    grantsReporting: [],
    affectsExperience: true,
  },
  {
    id: "seo_visibility",
    label: "SEO & Search Visibility",
    summary: "Indexing, search presence, and visibility monitoring.",
    kind: "included",
    grantsModules: modules("website-health", "analytics"),
    grantsReporting: ["seo"],
    affectsExperience: true,
  },
  {
    id: "analytics_reporting",
    label: "Analytics & Performance",
    summary: "Analytics, reports, and executive review of performance.",
    kind: "included",
    grantsModules: modules("analytics", "reports", "executive-review"),
    grantsReporting: ["website-analytics", "executive-reporting"],
    affectsExperience: true,
  },
  {
    id: "inventory_experience",
    label: "Inventory Experience",
    summary: "Client inventory presentation and listing management.",
    kind: "included",
    grantsModules: modules("inventory"),
    grantsReporting: [],
    affectsExperience: true,
  },
  {
    id: "growth_strategy",
    label: "Growth Strategy",
    summary: "Partnership home and executive review of the retained relationship.",
    kind: "included",
    grantsModules: modules("executive-performance", "executive-review"),
    grantsReporting: [],
    affectsExperience: true,
  },
  {
    id: "hosting_infrastructure",
    label: "Hosting & Infrastructure",
    summary: "Platform hosting, monitoring, and website workspace access.",
    kind: "included",
    grantsModules: modules("website-workspace", "website-health"),
    grantsReporting: [],
    affectsExperience: true,
  },
  {
    id: "lead_conversion",
    label: "Lead & Conversion Infrastructure",
    summary: "Landing pages, lead capture, and request flow.",
    kind: "included",
    grantsModules: modules("website-workspace", "requests"),
    grantsReporting: [],
    affectsExperience: true,
  },
  {
    id: "google_ads_management",
    label: "Google Ads Management",
    summary: "Paid search management and campaign reporting once connected.",
    kind: "add-on",
    grantsModules: modules("analytics"),
    grantsReporting: ["google-ads"],
    affectsExperience: true,
  },
  {
    id: "active_growth_campaign",
    label: "Active Growth Campaign",
    summary: "Campaign work beyond baseline infrastructure. No dedicated portal module yet.",
    kind: "add-on",
    grantsModules: [],
    grantsReporting: [],
    affectsExperience: true,
  },
  {
    id: "performance_component",
    label: "Performance Component",
    summary: "Commercial performance obligation. Does not compose portal modules.",
    kind: "performance",
    grantsModules: [],
    grantsReporting: [],
    affectsExperience: false,
  },
];

const BY_ID = new Map(SERVICE_CAPABILITY_CATALOG.map((entry) => [entry.id, entry]));

export function isServiceCapabilityId(raw: unknown): raw is ServiceCapabilityId {
  return typeof raw === "string" && (SERVICE_CAPABILITY_IDS as readonly string[]).includes(raw);
}

export function getServiceCapability(id: string): ServiceCapabilityDefinition | null {
  return BY_ID.get(id as ServiceCapabilityId) ?? null;
}

export function listAddOnCapabilities(): readonly ServiceCapabilityDefinition[] {
  return SERVICE_CAPABILITY_CATALOG.filter((entry) => entry.kind === "add-on");
}

export function listExperienceCapabilities(): readonly ServiceCapabilityDefinition[] {
  return SERVICE_CAPABILITY_CATALOG.filter((entry) => entry.affectsExperience);
}
