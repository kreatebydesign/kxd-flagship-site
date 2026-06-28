import type { AutomationModule } from "./types";

export interface ModuleRegistryEntry {
  id: AutomationModule;
  label: string;
  connected: boolean;
  description: string;
}

export const MODULE_REGISTRY: ModuleRegistryEntry[] = [
  { id: "Launch", label: "Launch", connected: true, description: "Client launch workflow" },
  { id: "Onboarding", label: "Onboarding", connected: true, description: "Client intake approvals" },
  { id: "Infrastructure", label: "Infrastructure", connected: true, description: "Infrastructure events and registry" },
  { id: "Website Auditor", label: "Website Auditor", connected: true, description: "Public website audits" },
  { id: "Founder Intelligence", label: "Founder Intelligence", connected: true, description: "Signal consumer" },
  { id: "Growth", label: "Growth", connected: true, description: "Retainers and expansion" },
  { id: "Creative", label: "Creative", connected: false, description: "Creative engine — ready to connect" },
  { id: "Projects", label: "Projects", connected: true, description: "Client project delivery" },
  { id: "Requests", label: "Requests", connected: false, description: "Client requests — ready to connect" },
  { id: "Deliverables", label: "Deliverables", connected: false, description: "Monthly deliverables — ready to connect" },
  { id: "Portal", label: "Portal", connected: false, description: "Client HQ — ready to connect" },
  { id: "Integrations", label: "Integrations", connected: true, description: "Live integration sync events" },
];
