/**
 * KXD Core — Client HQ module registry.
 * Future OS editions (Contractor, Hospitality, Motorsports, etc.)
 * enable or disable modules without rewriting the experience.
 */

export type ClientHqModuleId =
  | "overview"
  | "projects"
  | "deliverables"
  | "requests"
  | "assets"
  | "invoices"
  | "meetings"
  | "analytics"
  | "reports"
  | "website-health"
  | "resources"
  | "team"
  | "settings"
  | "advisor";

export interface ClientHqModuleConfig {
  id: ClientHqModuleId;
  enabled: boolean;
  label: string;
}

/** Default Client HQ module set — all enabled for Creative OS */
export const CLIENT_HQ_MODULES: Record<ClientHqModuleId, ClientHqModuleConfig> = {
  overview: { id: "overview", enabled: true, label: "Overview" },
  projects: { id: "projects", enabled: true, label: "Projects" },
  deliverables: { id: "deliverables", enabled: true, label: "Deliverables" },
  requests: { id: "requests", enabled: true, label: "Requests" },
  assets: { id: "assets", enabled: true, label: "Assets" },
  invoices: { id: "invoices", enabled: true, label: "Invoices" },
  meetings: { id: "meetings", enabled: true, label: "Meetings" },
  analytics: { id: "analytics", enabled: true, label: "Analytics" },
  reports: { id: "reports", enabled: true, label: "Reports" },
  "website-health": { id: "website-health", enabled: true, label: "Website Health" },
  resources: { id: "resources", enabled: true, label: "Resources" },
  team: { id: "team", enabled: true, label: "Team" },
  settings: { id: "settings", enabled: true, label: "Settings" },
  advisor: { id: "advisor", enabled: true, label: "AI Advisor" },
};

export function isClientHqModuleEnabled(moduleId: ClientHqModuleId): boolean {
  return CLIENT_HQ_MODULES[moduleId]?.enabled ?? false;
}
