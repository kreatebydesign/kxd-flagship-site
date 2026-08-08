/**
 * Canonical capability registry — Phase 1 CES consolidation.
 *
 * Single module truth for portal navigation, CES, plans/entitlements,
 * provisioning, and workspace personalization. Legacy registries map here.
 *
 * Kinds:
 * - portal — may appear in the client portal when visibility rules pass
 * - reporting — reporting capability; never a nav item by itself
 * - internal — KXD operator/platform only; never portal-visible
 * - future — packaging placeholder; not portal-visible until promoted
 */

import type { KxdModuleId } from "@/lib/editions/types";
import {
  ALL_REPORTING_CAPABILITIES,
  type ReportingCapabilityId,
} from "@/lib/reporting/domain/capabilities";
import type { CesNavGroupId } from "./types";

export type CanonicalCapabilityKind =
  | "portal"
  | "reporting"
  | "internal"
  | "future";

/**
 * How a portal module becomes visible (after edition + internal-only gates).
 *
 * - always: overview / settings — edition only
 * - ces-opt-in: native CES experience modules — profile.enabledModules (plan-gated at resolve)
 * - hq-default: former Client HQ surfaces — edition-on for fallback/generic HQ;
 *   active CES profiles (source === "profile") allowlist listed HQ ids only
 *   (+ reporting implications). Website Review is never a hide-all switch.
 * - opt-in: unfinished/stub client modules — never default-visible; must be
 *   explicitly listed on the experience profile (Advisor).
 * - billing: Stripe test mapping eligibility
 * - portfolio: multi-account membership (not a CES entitlement)
 * - presentation: executive-performance — entitlement and/or authored presentation
 */
export type PortalModuleActivation =
  | "always"
  | "ces-opt-in"
  | "hq-default"
  | "opt-in"
  | "billing"
  | "portfolio"
  | "presentation";

export type CanonicalCapabilityDefinition = {
  key: string;
  label: string;
  kind: CanonicalCapabilityKind;
  /** When true, never surface in client portal even if entitled. */
  internalOnly: boolean;
  aliases?: readonly string[];
  /** Edition platform module used for edition-level nav gating. */
  editionModule?: KxdModuleId;
  portal?: {
    navGroup: CesNavGroupId;
    navOrder: number;
    href: string;
    activation: PortalModuleActivation;
    vocabularyNamespace?: string;
    /** Include in CES_MODULE_REGISTRY (experience-module routes). */
    cesRegistry?: boolean;
  };
};

export const CES_EXPERIENCE_MODULE_IDS = [
  "website-review",
  "website-workspace",
  "executive-performance",
  "executive-review",
  "inventory",
] as const;

export type CesExperienceModuleId = (typeof CES_EXPERIENCE_MODULE_IDS)[number];

export const CLIENT_HQ_PORTAL_MODULE_IDS = [
  "overview",
  "projects",
  "deliverables",
  "requests",
  "assets",
  "invoices",
  "meetings",
  "analytics",
  "reports",
  "website-health",
  "resources",
  "team",
  "settings",
  "advisor",
] as const;

export type ClientHqPortalModuleId = (typeof CLIENT_HQ_PORTAL_MODULE_IDS)[number];

export const PORTAL_MODULE_IDS = [
  ...CES_EXPERIENCE_MODULE_IDS,
  ...CLIENT_HQ_PORTAL_MODULE_IDS,
  "portfolio",
] as const;

export type PortalModuleId = (typeof PORTAL_MODULE_IDS)[number];

/** HQ modules that trigger explicit allowlist mode when present on a CES profile. */
export const HQ_CONFIGURABLE_MODULE_IDS = [
  "projects",
  "deliverables",
  "requests",
  "assets",
  "meetings",
  "analytics",
  "reports",
  "website-health",
  "resources",
  "team",
  "advisor",
] as const satisfies readonly ClientHqPortalModuleId[];

const PORTAL_DEFS: CanonicalCapabilityDefinition[] = [
  {
    key: "overview",
    label: "Overview",
    kind: "portal",
    internalOnly: false,
    editionModule: "client-hq",
    portal: {
      navGroup: "headquarters",
      navOrder: 1,
      href: "/portal",
      activation: "always",
    },
  },
  {
    key: "portfolio",
    label: "Portfolio",
    kind: "portal",
    internalOnly: false,
    editionModule: "client-hq",
    portal: {
      navGroup: "headquarters",
      navOrder: 2,
      href: "/portal/portfolio",
      activation: "portfolio",
    },
  },
  {
    key: "executive-performance",
    label: "Partnership",
    kind: "portal",
    internalOnly: false,
    editionModule: "client-hq",
    aliases: ["partnership"],
    portal: {
      navGroup: "headquarters",
      navOrder: 3,
      href: "/portal/partnership",
      activation: "presentation",
      vocabularyNamespace: "executive-performance",
      cesRegistry: true,
    },
  },
  {
    key: "executive-review",
    label: "Executive Review",
    kind: "portal",
    internalOnly: false,
    editionModule: "client-hq",
    portal: {
      navGroup: "headquarters",
      navOrder: 4,
      href: "/portal/executive-review",
      activation: "ces-opt-in",
      vocabularyNamespace: "executive-review",
      cesRegistry: true,
    },
  },
  {
    key: "website-review",
    label: "Website Review",
    kind: "portal",
    internalOnly: false,
    editionModule: "client-hq",
    aliases: ["visual-review"],
    portal: {
      navGroup: "work",
      navOrder: 5,
      href: "/portal/website-review",
      activation: "ces-opt-in",
      vocabularyNamespace: "website-review",
      cesRegistry: true,
    },
  },
  {
    key: "website-workspace",
    label: "Website Workspace",
    kind: "portal",
    internalOnly: false,
    editionModule: "client-hq",
    portal: {
      navGroup: "work",
      navOrder: 6,
      href: "/portal/website-workspace",
      activation: "ces-opt-in",
      vocabularyNamespace: "website-workspace",
      cesRegistry: true,
    },
  },
  {
    key: "projects",
    label: "Projects",
    kind: "portal",
    internalOnly: false,
    editionModule: "client-hq",
    portal: {
      navGroup: "work",
      navOrder: 10,
      href: "/portal/projects",
      activation: "hq-default",
    },
  },
  {
    key: "deliverables",
    label: "Deliverables",
    kind: "portal",
    internalOnly: false,
    editionModule: "client-hq",
    portal: {
      navGroup: "work",
      navOrder: 11,
      href: "/portal/deliverables",
      activation: "hq-default",
    },
  },
  {
    key: "requests",
    label: "Requests",
    kind: "portal",
    internalOnly: false,
    editionModule: "client-hq",
    portal: {
      navGroup: "work",
      navOrder: 12,
      href: "/portal/requests",
      activation: "hq-default",
    },
  },
  {
    key: "inventory",
    label: "Inventory",
    kind: "portal",
    internalOnly: false,
    editionModule: "client-hq",
    aliases: ["public-showroom"],
    portal: {
      navGroup: "work",
      navOrder: 8,
      href: "/portal/inventory",
      activation: "ces-opt-in",
      vocabularyNamespace: "inventory",
      cesRegistry: true,
    },
  },
  {
    key: "assets",
    label: "Assets",
    kind: "portal",
    internalOnly: false,
    editionModule: "client-hq",
    portal: {
      navGroup: "library",
      navOrder: 20,
      href: "/portal/assets",
      activation: "hq-default",
    },
  },
  {
    key: "resources",
    label: "Resources",
    kind: "portal",
    internalOnly: false,
    editionModule: "client-hq",
    portal: {
      navGroup: "library",
      navOrder: 21,
      href: "/portal/resources",
      activation: "hq-default",
    },
  },
  {
    key: "website-health",
    label: "Website Health",
    kind: "portal",
    internalOnly: false,
    editionModule: "infrastructure",
    portal: {
      navGroup: "intelligence",
      navOrder: 30,
      href: "/portal/website-health",
      activation: "hq-default",
    },
  },
  {
    key: "analytics",
    label: "Analytics",
    kind: "portal",
    internalOnly: false,
    editionModule: "reporting",
    portal: {
      navGroup: "intelligence",
      navOrder: 31,
      href: "/portal/analytics",
      activation: "hq-default",
    },
  },
  {
    key: "reports",
    label: "Reports",
    kind: "portal",
    internalOnly: false,
    editionModule: "reporting",
    portal: {
      navGroup: "intelligence",
      navOrder: 32,
      href: "/portal/reports",
      activation: "hq-default",
    },
  },
  {
    key: "advisor",
    label: "AI Advisor",
    kind: "portal",
    internalOnly: false,
    editionModule: "brain",
    portal: {
      navGroup: "intelligence",
      navOrder: 39,
      href: "/portal/advisor",
      activation: "opt-in",
    },
  },
  {
    key: "invoices",
    label: "Billing",
    kind: "portal",
    internalOnly: false,
    editionModule: "sales",
    portal: {
      navGroup: "account",
      navOrder: 40,
      href: "/portal/invoices",
      activation: "billing",
    },
  },
  {
    key: "meetings",
    label: "Meetings",
    kind: "portal",
    internalOnly: false,
    editionModule: "timeline",
    portal: {
      navGroup: "account",
      navOrder: 41,
      href: "/portal/meetings",
      activation: "hq-default",
    },
  },
  {
    key: "team",
    label: "Team",
    kind: "portal",
    internalOnly: false,
    editionModule: "client-hq",
    portal: {
      navGroup: "account",
      navOrder: 42,
      href: "/portal/team",
      activation: "hq-default",
    },
  },
  {
    key: "settings",
    label: "Settings",
    kind: "portal",
    internalOnly: false,
    editionModule: "client-hq",
    portal: {
      navGroup: "account",
      navOrder: 49,
      href: "/portal/settings",
      activation: "always",
    },
  },
];

const REPORTING_DEFS: CanonicalCapabilityDefinition[] =
  ALL_REPORTING_CAPABILITIES.map((key) => ({
    key,
    label: key
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    kind: "reporting" as const,
    internalOnly: false,
    editionModule: "reporting" as const,
  }));

const INTERNAL_AND_FUTURE_DEFS: CanonicalCapabilityDefinition[] = [
  {
    key: "client-portal",
    label: "Client Portal",
    kind: "internal",
    internalOnly: true,
  },
  {
    key: "executive-workspace",
    label: "Executive Workspace",
    kind: "internal",
    internalOnly: true,
  },
  {
    key: "client-provisioning",
    label: "Client Provisioning",
    kind: "internal",
    internalOnly: true,
  },
  {
    key: "launch-wizard",
    label: "Launch Wizard",
    kind: "internal",
    internalOnly: true,
  },
  {
    key: "morning-brief",
    label: "Morning Brief",
    kind: "internal",
    internalOnly: true,
  },
  {
    key: "focus-mode",
    label: "Focus Mode",
    kind: "internal",
    internalOnly: true,
  },
  {
    key: "kxd-connect",
    label: "KXD Connect",
    kind: "future",
    internalOnly: true,
  },
  {
    key: "communications",
    label: "Communications",
    kind: "future",
    internalOnly: false,
  },
  {
    key: "calendar",
    label: "Calendar",
    kind: "future",
    internalOnly: false,
  },
  {
    key: "observer",
    label: "Observer",
    kind: "internal",
    internalOnly: true,
  },
  {
    key: "business-brain",
    label: "Business Brain",
    kind: "internal",
    internalOnly: true,
    aliases: ["brain"],
  },
  {
    key: "pulse",
    label: "Pulse",
    kind: "internal",
    internalOnly: true,
  },
  {
    key: "executive-narrative",
    label: "Executive Narrative",
    kind: "internal",
    internalOnly: true,
  },
  {
    key: "rituals",
    label: "Executive Rituals",
    kind: "internal",
    internalOnly: true,
  },
  {
    key: "work-engine",
    label: "Work Engine",
    kind: "internal",
    internalOnly: true,
  },
  {
    key: "relationship-intelligence",
    label: "Relationship Intelligence",
    kind: "internal",
    internalOnly: true,
  },
  {
    key: "client-command",
    label: "Client Command",
    kind: "internal",
    internalOnly: true,
  },
  {
    key: "csi",
    label: "Client Site Intelligence",
    kind: "internal",
    internalOnly: true,
    aliases: ["client-site-intelligence"],
  },
];

export const CANONICAL_CAPABILITY_REGISTRY: readonly CanonicalCapabilityDefinition[] =
  [...PORTAL_DEFS, ...REPORTING_DEFS, ...INTERNAL_AND_FUTURE_DEFS];

const BY_KEY = new Map<string, CanonicalCapabilityDefinition>();
const ALIAS_TO_KEY = new Map<string, string>();

for (const def of CANONICAL_CAPABILITY_REGISTRY) {
  BY_KEY.set(def.key, def);
  for (const alias of def.aliases ?? []) {
    ALIAS_TO_KEY.set(alias, def.key);
  }
}

const PORTAL_MODULE_ID_SET = new Set<string>(PORTAL_MODULE_IDS);
const CES_EXPERIENCE_SET = new Set<string>(CES_EXPERIENCE_MODULE_IDS);
const HQ_CONFIGURABLE_SET = new Set<string>(HQ_CONFIGURABLE_MODULE_IDS);
const REPORTING_SET = new Set<string>(ALL_REPORTING_CAPABILITIES);

export function canonicalizeCapabilityKey(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (BY_KEY.has(trimmed)) return trimmed;
  return ALIAS_TO_KEY.get(trimmed) ?? null;
}

export function getCanonicalCapability(
  raw: string,
): CanonicalCapabilityDefinition | null {
  const key = canonicalizeCapabilityKey(raw);
  if (!key) return null;
  return BY_KEY.get(key) ?? null;
}

export function isKnownCanonicalCapability(raw: string): boolean {
  return canonicalizeCapabilityKey(raw) != null;
}

export function isInternalOnlyCapability(raw: string): boolean {
  const def = getCanonicalCapability(raw);
  return Boolean(def?.internalOnly);
}

export function isPortalModuleId(raw: string): raw is PortalModuleId {
  const key = canonicalizeCapabilityKey(raw);
  return Boolean(key && PORTAL_MODULE_ID_SET.has(key));
}

export function isCesExperienceModuleId(raw: string): raw is CesExperienceModuleId {
  const key = canonicalizeCapabilityKey(raw);
  return Boolean(key && CES_EXPERIENCE_SET.has(key));
}

export function isReportingCapabilityId(raw: string): raw is ReportingCapabilityId {
  const key = canonicalizeCapabilityKey(raw);
  return Boolean(key && REPORTING_SET.has(key));
}

export function isHqConfigurableModuleId(raw: string): boolean {
  const key = canonicalizeCapabilityKey(raw);
  return Boolean(key && HQ_CONFIGURABLE_SET.has(key));
}

export function listPortalCapabilityDefinitions(): CanonicalCapabilityDefinition[] {
  return CANONICAL_CAPABILITY_REGISTRY.filter(
    (def) => def.kind === "portal" && def.portal && !def.internalOnly,
  );
}

export function listCesRegistryDefinitions(): CanonicalCapabilityDefinition[] {
  return listPortalCapabilityDefinitions().filter((def) => def.portal?.cesRegistry);
}

export function normalizePortalModuleList(
  values: readonly unknown[] | null | undefined,
): PortalModuleId[] {
  if (!values) return [];
  const out: PortalModuleId[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    if (typeof raw !== "string") continue;
    const key = canonicalizeCapabilityKey(raw);
    if (!key || !PORTAL_MODULE_ID_SET.has(key) || seen.has(key)) continue;
    const def = BY_KEY.get(key);
    if (!def || def.internalOnly || def.kind !== "portal") continue;
    seen.add(key);
    out.push(key as PortalModuleId);
  }
  return out;
}

export function normalizeCesExperienceModuleList(
  values: readonly unknown[] | null | undefined,
): CesExperienceModuleId[] {
  return normalizePortalModuleList(values).filter((id): id is CesExperienceModuleId =>
    CES_EXPERIENCE_SET.has(id),
  );
}

export function normalizeReportingCapabilityList(
  values: readonly unknown[] | null | undefined,
): ReportingCapabilityId[] {
  if (!values) return [];
  const out: ReportingCapabilityId[] = [];
  const seen = new Set<string>();
  for (const raw of values) {
    if (typeof raw !== "string") continue;
    const key = canonicalizeCapabilityKey(raw);
    if (!key || !REPORTING_SET.has(key) || seen.has(key)) continue;
    const def = BY_KEY.get(key);
    if (!def || def.internalOnly) continue;
    seen.add(key);
    out.push(key as ReportingCapabilityId);
  }
  return out;
}

/** Reporting capabilities that imply Analytics / Reports / Website Health nav. */
export const REPORTING_IMPLIED_PORTAL_MODULES: Record<
  ReportingCapabilityId,
  readonly PortalModuleId[]
> = {
  "website-analytics": ["analytics", "website-health"],
  "google-ads": ["analytics"],
  seo: ["analytics", "website-health"],
  gbp: ["analytics"],
  stripe: [],
  meta: ["analytics"],
  clarity: ["analytics"],
  crm: [],
  "call-tracking": [],
  "executive-reporting": ["reports"],
};

export function impliedPortalModulesFromReporting(
  capabilities: readonly string[],
): PortalModuleId[] {
  const out: PortalModuleId[] = [];
  const seen = new Set<string>();
  for (const raw of capabilities) {
    if (!isReportingCapabilityId(raw)) continue;
    for (const moduleId of REPORTING_IMPLIED_PORTAL_MODULES[raw]) {
      if (seen.has(moduleId)) continue;
      seen.add(moduleId);
      out.push(moduleId);
    }
  }
  return out;
}

export function getCanonicalCapabilityLabel(raw: string): string {
  return getCanonicalCapability(raw)?.label ?? raw;
}
