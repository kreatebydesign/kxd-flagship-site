/**
 * KXD Core — Client HQ module registry.
 * Edition framework controls visibility per edition (Phase 8A).
 */

import { isModuleEnabled } from "@/lib/editions";
import { PORTAL_NAV_MODULE_MAP } from "@/lib/editions/navigation";

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

const CLIENT_HQ_MODULE_LABELS: Record<ClientHqModuleId, string> = {
  overview: "Overview",
  projects: "Projects",
  deliverables: "Deliverables",
  requests: "Requests",
  assets: "Assets",
  invoices: "Invoices",
  meetings: "Meetings",
  analytics: "Analytics",
  reports: "Reports",
  "website-health": "Website Health",
  resources: "Resources",
  team: "Team",
  settings: "Settings",
  advisor: "AI Advisor",
};

/** Default Client HQ module set — edition-aware */
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
  const editionModule = PORTAL_NAV_MODULE_MAP[moduleId];
  return isModuleEnabled(editionModule);
}

export function getClientHqModuleLabel(moduleId: ClientHqModuleId): string {
  return CLIENT_HQ_MODULE_LABELS[moduleId] ?? moduleId;
}
