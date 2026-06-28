import type { EditionId, EditionDefinition, KxdModuleDefinition, KxdModuleId } from "./types";

export const KXD_MODULE_IDS: KxdModuleId[] = [
  "brain",
  "automation",
  "sales",
  "client-hq",
  "reporting",
  "infrastructure",
  "playbooks",
  "client-success",
  "work",
  "timeline",
  "notifications",
  "search",
  "integrations",
  "creative",
  "growth",
  "onboarding",
  "strategy",
  "audits",
  "founder",
  "portfolio",
  "operations",
];

export const KXD_MODULE_REGISTRY: Record<KxdModuleId, KxdModuleDefinition> = {
  brain: {
    id: "brain",
    name: "KXD Brain",
    category: "intelligence",
    required: false,
    editionSupport: "all",
    description: "Signals, patterns, and recommendations",
  },
  automation: {
    id: "automation",
    name: "Automation",
    category: "platform",
    required: false,
    editionSupport: "all",
    dependencies: ["integrations"],
    description: "Event engine and notification routing",
  },
  sales: {
    id: "sales",
    name: "Sales",
    category: "sales",
    required: false,
    editionSupport: "all",
    description: "Pipeline, leads, proposals, and forecast",
  },
  "client-hq": {
    id: "client-hq",
    name: "Client HQ",
    category: "client",
    required: false,
    editionSupport: "all",
    description: "Client portal and headquarters experience",
  },
  reporting: {
    id: "reporting",
    name: "Reporting",
    category: "intelligence",
    required: false,
    editionSupport: "all",
    description: "Executive monthly reports and KPIs",
  },
  infrastructure: {
    id: "infrastructure",
    name: "Infrastructure",
    category: "operations",
    required: false,
    editionSupport: "all",
    description: "Domains, hosting, SSL, and technical registry",
  },
  playbooks: {
    id: "playbooks",
    name: "Playbooks",
    category: "operations",
    required: false,
    editionSupport: "all",
    description: "SOP and playbook execution",
  },
  "client-success": {
    id: "client-success",
    name: "Client Success",
    category: "client",
    required: false,
    editionSupport: "all",
    description: "Success plans and check-ins",
  },
  work: {
    id: "work",
    name: "Work",
    category: "operations",
    required: false,
    editionSupport: "all",
    description: "Client work manager and task execution",
  },
  timeline: {
    id: "timeline",
    name: "Timeline",
    category: "client",
    required: false,
    editionSupport: "all",
    description: "Relationship and executive timeline",
  },
  notifications: {
    id: "notifications",
    name: "Notifications",
    category: "platform",
    required: true,
    editionSupport: "all",
    description: "In-app notification center",
  },
  search: {
    id: "search",
    name: "Search",
    category: "platform",
    required: true,
    editionSupport: "all",
    description: "Universal command search",
  },
  integrations: {
    id: "integrations",
    name: "Integrations",
    category: "platform",
    required: false,
    editionSupport: "all",
    description: "Connector hub and integration readiness",
  },
  creative: {
    id: "creative",
    name: "Creative",
    category: "studio",
    required: false,
    editionSupport: ["kxd-core", "creative-studio-os"],
    description: "Creative engine, reels, and studio output",
  },
  growth: {
    id: "growth",
    name: "Growth",
    category: "intelligence",
    required: false,
    editionSupport: "all",
    description: "Growth opportunities and acquisition",
  },
  onboarding: {
    id: "onboarding",
    name: "Onboarding",
    category: "client",
    required: false,
    editionSupport: "all",
    description: "Client onboarding workflows",
  },
  strategy: {
    id: "strategy",
    name: "Strategy Vault",
    category: "intelligence",
    required: false,
    editionSupport: "all",
    description: "Executive notes and strategy vault",
  },
  audits: {
    id: "audits",
    name: "Audits",
    category: "intelligence",
    required: false,
    editionSupport: "all",
    description: "Website audits and audit desk",
  },
  founder: {
    id: "founder",
    name: "Founder",
    category: "intelligence",
    required: false,
    editionSupport: "all",
    description: "Founder briefing and intelligence",
  },
  portfolio: {
    id: "portfolio",
    name: "Portfolio",
    category: "client",
    required: false,
    editionSupport: "all",
    description: "Client portfolio and accounts",
  },
  operations: {
    id: "operations",
    name: "Operations Hub",
    category: "platform",
    required: true,
    editionSupport: "all",
    description: "Today, command, and daily operations surfaces",
  },
};

export function isModuleSupportedByEdition(
  moduleId: KxdModuleId,
  editionId: EditionId,
): boolean {
  const mod = KXD_MODULE_REGISTRY[moduleId];
  if (!mod) return false;
  if (mod.editionSupport === "all") return true;
  return mod.editionSupport.includes(editionId);
}

export function listModuleDefinitions(): KxdModuleDefinition[] {
  return KXD_MODULE_IDS.map((id) => KXD_MODULE_REGISTRY[id]);
}

export function isModuleEnabledForEdition(
  moduleId: KxdModuleId,
  edition: EditionDefinition,
): boolean {
  const mod = KXD_MODULE_REGISTRY[moduleId];
  if (!mod) return false;
  if (mod.required) return true;

  if (!isModuleSupportedByEdition(moduleId, edition.id)) return false;

  if (edition.enabledModules?.length) {
    return edition.enabledModules.includes(moduleId);
  }

  if (edition.disabledModules?.includes(moduleId)) return false;

  if (mod.dependencies?.length) {
    for (const dep of mod.dependencies) {
      if (!isModuleEnabledForEdition(dep, edition)) return false;
    }
  }

  return true;
}

export function resolveEditionModuleStates(edition: EditionDefinition): Array<{
  id: KxdModuleId;
  name: string;
  category: KxdModuleDefinition["category"];
  enabled: boolean;
  required: boolean;
}> {
  return KXD_MODULE_IDS.map((id) => {
    const mod = KXD_MODULE_REGISTRY[id];
    return {
      id,
      name: mod.name,
      category: mod.category,
      enabled: isModuleEnabledForEdition(id, edition),
      required: mod.required,
    };
  });
}
