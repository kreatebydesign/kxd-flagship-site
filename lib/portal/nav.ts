import type { CesModuleId } from "@/lib/ces";
import { CES_MODULE_REGISTRY } from "@/lib/ces/modules/registry";
import { getCesNavItems, resolveCesNavId } from "@/lib/ces/modules/nav";
import type { CesNavGroupId } from "@/lib/ces/modules/types";
import {
  CLIENT_HQ_PORTAL_MODULE_IDS,
  getCanonicalCapability,
  normalizeCesExperienceModuleList,
  type ClientHqPortalModuleId,
  type PortalModuleId,
} from "@/lib/ces/modules/canonical";
import { isPortalModuleVisible } from "@/lib/ces/modules/visibility";
import type { ResolvedExperienceProfile } from "@/lib/ces";
import { getEditionBranding, getEditionNavigation } from "@/lib/editions";
import { isPortalNavEnabled } from "@/lib/editions/navigation";
import { isClientHqModuleEnabled, type ClientHqModuleId } from "./modules";
import {
  CES_PRIMARY_PORTAL_NAV_IDS,
  CES_PRIMAL_ARCHIVE_NAV_IDS,
  CES_RESULTS_PORTAL_NAV_IDS,
  CES_WEBSITE_PORTAL_NAV_IDS,
  clientPortalNavGroupLabel,
  clientPortalNavLabel,
} from "@/lib/ces/copy/client-nav-labels";
import { resolvePortalHomeShell } from "@/lib/ces/modules/home";

export type ClientHqNavId = ClientHqModuleId;
/** Shared Core partnership briefing — nav id aliases executive-performance. */
export type PortalBriefingNavId = "partnership";
/** Phase 4 Batch F — multi-account authorized portfolio (not a CES entitlement). */
export type PortalPortfolioNavId = "portfolio";
/** Authoritative commercial agreement surface — billingPlan-backed (not a CES entitlement). */
export type PortalAgreementNavId = "agreement";
/** External website editor doorway — configured per client infrastructure. */
export type PortalWebsiteEditorNavId = "website-editor";
export type PortalNavId =
  | ClientHqNavId
  | CesModuleId
  | PortalBriefingNavId
  | PortalPortfolioNavId
  | PortalAgreementNavId
  | PortalWebsiteEditorNavId;

export interface ClientHqNavItem {
  id: ClientHqNavId;
  label: string;
  href: string;
  moduleId: ClientHqModuleId;
}

export interface ClientHqNavGroup {
  label: string;
  items: ClientHqNavItem[];
}

export interface PortalNavItem {
  id: PortalNavId;
  label: string;
  href: string;
  external?: boolean;
}

export interface PortalNavGroup {
  label: string;
  items: PortalNavItem[];
}

const PORTAL_GROUP_TO_CES: Record<string, CesNavGroupId> = {
  Headquarters: "headquarters",
  Work: "work",
  Library: "library",
  Intelligence: "intelligence",
  Account: "account",
};

const GROUP_LABELS: Record<CesNavGroupId, string> = {
  headquarters: "Headquarters",
  work: "Work",
  library: "Library",
  intelligence: "Intelligence",
  account: "Account",
};

function hqNavItem(id: ClientHqPortalModuleId): ClientHqNavItem {
  const def = getCanonicalCapability(id);
  return {
    id,
    label: def?.label ?? id,
    href: def?.portal?.href ?? `/portal/${id}`,
    moduleId: id,
  };
}

const NAV_ITEMS: ClientHqNavItem[] = CLIENT_HQ_PORTAL_MODULE_IDS.map(hqNavItem);

export const CLIENT_HQ_NAV_GROUPS: ClientHqNavGroup[] = (
  ["headquarters", "work", "library", "intelligence", "account"] as CesNavGroupId[]
).map((groupId) => ({
  label: GROUP_LABELS[groupId],
  items: NAV_ITEMS.filter((item) => {
    const def = getCanonicalCapability(item.id);
    return def?.portal?.navGroup === groupId;
  }).sort((a, b) => {
    const orderA = getCanonicalCapability(a.id)?.portal?.navOrder ?? 0;
    const orderB = getCanonicalCapability(b.id)?.portal?.navOrder ?? 0;
    return orderA - orderB;
  }),
})).filter((group) => group.items.length > 0);

export function getEnabledClientHqNavGroups(): ClientHqNavGroup[] {
  const editionNav = getEditionNavigation();

  return CLIENT_HQ_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items
      .filter((item) => isClientHqModuleEnabled(item.moduleId))
      .filter((item) => isPortalNavEnabled(item.id))
      .map((item) => ({
        ...item,
        label: editionNav.portalNavLabels[item.id] ?? item.label,
      })),
  })).filter((group) => group.items.length > 0);
}

function navIdForPortalModule(moduleId: PortalModuleId): PortalNavId {
  if (moduleId === "executive-performance") return "partnership";
  return moduleId as PortalNavId;
}

/** CES nav reads enabledModules; keep portal allowlist CES ids in sync for render. */
function profileForPortalNav(profile: ResolvedExperienceProfile): ResolvedExperienceProfile {
  const cesFromPortal = normalizeCesExperienceModuleList(
    profile.enabledPortalModules ?? [],
  );
  const merged = normalizeCesExperienceModuleList([
    ...profile.enabledModules,
    ...cesFromPortal,
  ]);
  if (
    merged.length === profile.enabledModules.length &&
    merged.every((id, index) => profile.enabledModules[index] === id)
  ) {
    return profile;
  }
  return { ...profile, enabledModules: merged };
}

function injectCommercialAgreementNav(
  groups: PortalNavGroup[],
  commercialNavAvailable: boolean,
  relabel?: (id: string, label: string) => string,
): PortalNavGroup[] {
  if (!commercialNavAvailable) return groups;
  const label = relabel ? relabel("agreement", "Agreement") : "Agreement";
  const hasAgreement = groups.some((group) =>
    group.items.some((item) => item.id === "agreement"),
  );
  if (hasAgreement) return groups;

  const workIndex = groups.findIndex((group) => group.label === "Work");
  if (workIndex >= 0) {
    const next = [...groups];
    next[workIndex] = {
      ...next[workIndex],
      items: [
        ...next[workIndex].items,
        { id: "agreement", label, href: "/portal/agreement" },
      ],
    };
    return next;
  }

  return [
    ...groups,
    {
      label: "Work",
      items: [{ id: "agreement", label, href: "/portal/agreement" }],
    },
  ];
}

function injectWebsiteEditorNav(
  groups: PortalNavGroup[],
  websiteEditorUrl?: string | null,
): PortalNavGroup[] {
  const url = websiteEditorUrl?.trim();
  if (!url) return groups;

  const hasEditor = groups.some((group) =>
    group.items.some((item) => item.id === "website-editor"),
  );
  if (hasEditor) return groups;

  const item: PortalNavItem = {
    id: "website-editor",
    label: "Website Editor ↗",
    href: url,
    external: true,
  };

  const workIndex = groups.findIndex((group) => group.label === "Work");
  if (workIndex >= 0) {
    const next = [...groups];
    next[workIndex] = {
      ...next[workIndex],
      items: [item, ...next[workIndex].items],
    };
    return next;
  }

  const hqIndex = groups.findIndex((group) => group.label === "Headquarters");
  if (hqIndex >= 0) {
    const next = [...groups];
    next[hqIndex] = {
      ...next[hqIndex],
      items: [...next[hqIndex].items, item],
    };
    return next;
  }

  return [
    ...groups,
    {
      label: "Work",
      items: [item],
    },
  ];
}

/** Client HQ nav + CES module items — visibility is entitlement-aware, not flagship. */
export function getEnabledPortalNavGroups(
  profile?: ResolvedExperienceProfile | null,
  options?: {
    portfolioNavAvailable?: boolean;
    billingNavAvailable?: boolean;
    commercialNavAvailable?: boolean;
    websiteEditorUrl?: string | null;
  },
): PortalNavGroup[] {
  const portfolioNavAvailable = Boolean(options?.portfolioNavAvailable);
  const billingNavAvailable = Boolean(options?.billingNavAvailable);
  const commercialNavAvailable = Boolean(options?.commercialNavAvailable);
  const websiteEditorUrl = options?.websiteEditorUrl ?? null;
  const base = getEnabledClientHqNavGroups();

  if (!profile) {
    const groups = base
      .map((group) => {
      const portfolioItem: PortalNavItem[] =
        portfolioNavAvailable && group.label === "Headquarters"
          ? [
              {
                id: "portfolio",
                label: "All Businesses",
                href: "/portal/portfolio",
              },
            ]
          : [];
        const agreementItem: PortalNavItem[] =
          commercialNavAvailable && group.label === "Work"
            ? [{ id: "agreement", label: "Agreement", href: "/portal/agreement" }]
            : [];
        return {
          label: group.label,
          items: [
            ...group.items
              .filter((item) =>
                item.id === "invoices" ? billingNavAvailable : true,
              )
              .map(({ id, label, href }) => ({
                id: id as PortalNavId,
                label,
                href,
              })),
            ...portfolioItem,
            ...agreementItem,
          ],
        };
      })
      .filter((group) => group.items.length > 0);

    return injectWebsiteEditorNav(
      injectCommercialAgreementNav(groups, commercialNavAvailable),
      websiteEditorUrl,
    );
  }

  const navProfile = profileForPortalNav(profile);

  const visibilityCtx = {
    profile: navProfile,
    billingNavAvailable,
    portfolioNavAvailable,
    commercialNavAvailable,
  };
  const useClientLabels = resolvePortalHomeShell(navProfile) === "ces";
  const relabel = (id: string, label: string) =>
    useClientLabels ? clientPortalNavLabel(id, navProfile.terminology, label) : label;

  const cesItems = getCesNavItems(navProfile).filter((item) =>
    isPortalModuleVisible(item.moduleId, visibilityCtx),
  );

  const groups = base
    .map((group) => {
      const cesGroupId = PORTAL_GROUP_TO_CES[group.label];
      const cesForGroup = cesItems
        .filter((item) => {
          const def = CES_MODULE_REGISTRY.find((d) => d.moduleId === item.moduleId);
          return def?.navGroup === cesGroupId;
        })
        .map((item) => ({
          id: navIdForPortalModule(item.moduleId as PortalModuleId),
          label: relabel(item.moduleId, item.label),
          href: item.href,
        }));

      const partnershipItem: PortalNavItem[] =
        group.label === "Headquarters" &&
        isPortalModuleVisible("executive-performance", visibilityCtx) &&
        !cesForGroup.some((item) => item.id === "partnership")
          ? [
              {
                id: "partnership",
                label: relabel(
                  "executive-performance",
                  navProfile.terminology["nav.executive-performance"] ??
                    getCanonicalCapability("executive-performance")?.label ??
                    "Partnership",
                ),
                href: "/portal/partnership",
              },
            ]
          : [];

      const agreementItem: PortalNavItem[] =
        commercialNavAvailable && group.label === "Work"
          ? [
              {
                id: "agreement",
                label: relabel("agreement", "Agreement"),
                href: "/portal/agreement",
              },
            ]
          : [];

      return {
        label: group.label,
        items: [
          ...group.items.map(({ id, label, href }) => ({
            id: id as PortalNavId,
            label: relabel(id, label),
            href,
          })),
          ...partnershipItem,
          ...agreementItem,
          ...cesForGroup,
        ],
      };
    })
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (item.id === "agreement") return commercialNavAvailable;
        const moduleKey =
          item.id === "partnership" ? "executive-performance" : item.id;
        return isPortalModuleVisible(moduleKey, visibilityCtx);
      }),
    }))
    .filter((group) => group.items.length > 0);

  const withCommercial = injectWebsiteEditorNav(
    injectCommercialAgreementNav(groups, commercialNavAvailable, relabel),
    websiteEditorUrl,
  );

  // CES Client Command shell: calm four-destination primary nav.
  // All Businesses lives in the account switcher (not a synthetic client).
  if (useClientLabels) {
    return simplifyPrimaryPortalNav(
      withCommercial,
      relabel,
      navProfile.identity.clientSlug,
    );
  }

  return withCommercial;
}

/**
 * Collapse entitled nav into Operate · Results · Website · Account.
 * Overview + Leads lead; Performance + Reports follow; remaining entitled
 * destinations stay under Website / Account. Does not invent entitlements.
 * All Businesses stays in the account switcher (not a synthetic client).
 */
function simplifyPrimaryPortalNav(
  groups: PortalNavGroup[],
  relabel: (id: string, label: string) => string,
  clientSlug?: string | null,
): PortalNavGroup[] {
  const flat = groups.flatMap((group) => group.items);
  const byId = new Map<string, PortalNavItem>();
  for (const item of flat) {
    if (!byId.has(item.id)) byId.set(item.id, item);
  }

  const operateIds = ["overview", "leads"] as const;
  const resultsIds = [...CES_RESULTS_PORTAL_NAV_IDS];
  const claimedIds = new Set<string>([...CES_PRIMARY_PORTAL_NAV_IDS]);
  const accountIds = new Set(["settings", "invoices", "agreement", "team"]);
  const archiveIds = new Set<string>(
    clientSlug === "primal-motorsports" ? CES_PRIMAL_ARCHIVE_NAV_IDS : [],
  );
  const websiteIds = new Set<string>(CES_WEBSITE_PORTAL_NAV_IDS);

  const pick = (ids: readonly string[]): PortalNavItem[] => {
    const out: PortalNavItem[] = [];
    for (const id of ids) {
      const item = byId.get(id);
      if (!item) continue;
      out.push({ ...item, label: relabel(id, item.label) });
    }
    return out;
  };

  const operate = pick(operateIds);
  const results = pick(resultsIds);

  const website: PortalNavItem[] = [];
  const account: PortalNavItem[] = [];
  const management: PortalNavItem[] = [];
  for (const item of byId.values()) {
    if (claimedIds.has(item.id)) continue;
    if (item.id === "portfolio") continue;
    if (archiveIds.has(item.id)) continue;
    const labeled = { ...item, label: relabel(item.id, item.label) };
    if (accountIds.has(item.id)) account.push(labeled);
    else if (websiteIds.has(item.id)) website.push(labeled);
    else management.push(labeled);
  }

  const out: PortalNavGroup[] = [];
  if (operate.length > 0) {
    out.push({ label: clientPortalNavGroupLabel("Headquarters"), items: operate });
  }
  if (results.length > 0) {
    out.push({ label: "Results", items: results });
  }
  if (website.length > 0) {
    out.push({ label: "Website", items: website });
  }
  if (management.length > 0) {
    out.push({ label: "Management", items: management });
  }
  if (account.length > 0) {
    out.push({ label: clientPortalNavGroupLabel("Account"), items: account });
  }
  return out.length > 0 ? out : groups;
}

export function resolvePortalNavId(pathname: string): PortalNavId {
  if (pathname === "/portal/portfolio" || pathname.startsWith("/portal/portfolio/")) {
    return "portfolio";
  }
  if (pathname === "/portal/agreement" || pathname.startsWith("/portal/agreement/")) {
    return "agreement";
  }
  if (pathname === "/portal/partnership" || pathname.startsWith("/portal/partnership/")) {
    return "partnership";
  }

  const cesId = resolveCesNavId(pathname);
  if (cesId) {
    return cesId === "executive-performance"
      ? "partnership"
      : (cesId as PortalNavId);
  }

  const allItems = CLIENT_HQ_NAV_GROUPS.flatMap((g) => g.items);
  const sorted = [...allItems].sort((a, b) => b.href.length - a.href.length);
  const match = sorted.find((item) => clientHqNavIsActive(pathname, item.href));
  return match?.id ?? "overview";
}

export function getPortalEditionBranding() {
  return getEditionBranding();
}

export function clientHqNavIsActive(pathname: string, href: string): boolean {
  if (href === "/portal") return pathname === "/portal";
  return pathname.startsWith(href);
}
