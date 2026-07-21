/**
 * Client-eligible upgrade capabilities — curated subset of Phase 35A modules.
 * Internal-only and unfinished product surfaces are intentionally excluded.
 */

import {
  canonicalizeEntitlementModule,
  getEntitlementModuleLabel,
  isInternalOnlyEntitlement,
} from "@/lib/client-plans/modules";

export type UpgradeEligibleCapability = {
  key: string;
  label: string;
  summary: string;
  valueLine: string;
};

/**
 * Only portal-usable CES modules. Reporting add-ons remain operator-managed
 * through Plans & Access until a dedicated client-facing reporting request UX exists.
 */
export const CLIENT_UPGRADE_ELIGIBLE_CAPABILITIES: readonly UpgradeEligibleCapability[] =
  [
    {
      key: "website-workspace",
      label: "Website Workspace",
      summary: "Submit and track website change requests in one place.",
      valueLine:
        "Organize page updates, copy changes, and delivery notes without email chains.",
    },
    {
      key: "inventory",
      label: "Inventory",
      summary: "Manage listings and your public showroom.",
      valueLine:
        "Keep vehicle or product listings current and publish them to your showroom when ready.",
    },
    {
      key: "executive-performance",
      label: "Executive Performance",
      summary: "A higher-level performance workspace for your partnership.",
      valueLine:
        "See a calm executive view of signal and progress across your engagement.",
    },
    {
      key: "executive-review",
      label: "Executive Review",
      summary: "Structured executive review for leadership conversations.",
      valueLine:
        "Access a focused review surface designed for partnership check-ins.",
    },
    {
      key: "website-review",
      label: "Website Review",
      summary: "Collaborate on website feedback and revision flow.",
      valueLine:
        "Leave clear page-level feedback and follow revisions through delivery.",
    },
  ] as const;

const ELIGIBLE_KEY_SET = new Set(
  CLIENT_UPGRADE_ELIGIBLE_CAPABILITIES.map((c) => c.key),
);

export function isClientUpgradeEligibleModule(raw: string): boolean {
  const key = canonicalizeEntitlementModule(raw);
  if (!key || isInternalOnlyEntitlement(key)) return false;
  return ELIGIBLE_KEY_SET.has(key);
}

export function getUpgradeEligibleCapability(
  raw: string,
): UpgradeEligibleCapability | null {
  const key = canonicalizeEntitlementModule(raw);
  if (!key || !ELIGIBLE_KEY_SET.has(key)) return null;
  return (
    CLIENT_UPGRADE_ELIGIBLE_CAPABILITIES.find((c) => c.key === key) ?? {
      key,
      label: getEntitlementModuleLabel(key),
      summary: "Additional workspace capability.",
      valueLine: "Request access if this capability would help your team.",
    }
  );
}

export function listUpgradeEligibleCapabilities(): readonly UpgradeEligibleCapability[] {
  return CLIENT_UPGRADE_ELIGIBLE_CAPABILITIES;
}
