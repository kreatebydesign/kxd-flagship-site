import {
  getCanonicalCapability,
  isCesExperienceModuleId,
  isInternalOnlyCapability,
  isPortalModuleId,
  listPortalCapabilityDefinitions,
  type PortalModuleId,
} from "@/lib/ces/modules/canonical";
import type { OperatorModuleToggleKind } from "./types";

const DESCRIPTIONS: Partial<Record<PortalModuleId, string>> = {
  overview: "Portal home. Always available when the client can sign in.",
  portfolio: "Multi-account portfolio. Membership-gated, not a CES toggle.",
  "executive-performance":
    "Partnership / executive performance home. May also appear from an authored presentation.",
  "executive-review": "Focused executive review pack for this client.",
  "website-review": "Site review, revision requests, and visual feedback.",
  "website-workspace": "Page-level website update requests.",
  inventory: "Public inventory listings the client can manage.",
  projects: "Active and completed partnership projects.",
  deliverables: "Shared deliverables the client can open.",
  requests: "Client requests and awaiting-input work.",
  assets: "Shared files and brand assets.",
  resources: "Resource library.",
  "website-health": "Website health and search presence.",
  analytics: "Analytics and performance visibility.",
  reports: "Published client reports.",
  advisor: "AI Advisor is a stub and stays fail-closed until a later phase.",
  invoices: "Billing. Visible only with a valid test-mode Stripe mapping.",
  meetings: "Meetings the client is allowed to see.",
  team: "Client team roster.",
  settings: "Account settings. Always available.",
};

export function operatorModuleDescription(id: PortalModuleId): string {
  return DESCRIPTIONS[id] ?? getCanonicalCapability(id)?.label ?? id;
}

export function operatorModuleKind(id: PortalModuleId): OperatorModuleToggleKind {
  if (id === "advisor" || isInternalOnlyCapability(id)) return "locked";
  if (id === "overview" || id === "settings") return "always";
  if (id === "invoices" || id === "portfolio") return "gated";
  const def = getCanonicalCapability(id);
  if (!def?.portal || def.kind !== "portal") return "locked";
  return "toggle";
}

/** Portal modules an operator may persist on the experience profile. */
export function isOperatorToggleablePortalModule(id: string): id is PortalModuleId {
  if (!isPortalModuleId(id)) return false;
  if (isInternalOnlyCapability(id)) return false;
  return operatorModuleKind(id) === "toggle";
}

export function listOperatorPortalModuleIds(): PortalModuleId[] {
  return listPortalCapabilityDefinitions()
    .map((def) => def.key)
    .filter((key): key is PortalModuleId => isPortalModuleId(key));
}

export function planAllowsPortalModule(
  moduleId: PortalModuleId,
  entitlements: {
    isLegacy: boolean;
    isPaused: boolean;
    effectiveModules: readonly string[];
  },
): boolean {
  if (!isCesExperienceModuleId(moduleId)) return true;
  if (entitlements.isPaused) return false;
  if (entitlements.isLegacy) return true;
  return entitlements.effectiveModules.includes(moduleId);
}
