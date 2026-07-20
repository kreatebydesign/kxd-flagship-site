/**
 * Phase 34A.1 — Human labels + practical grouping for registry modules.
 */

import type { LaunchWizardModuleId } from "../types";

export type LaunchModuleCategoryId =
  | "client-experience"
  | "executive-intelligence"
  | "reporting"
  | "work-delivery"
  | "brand-content"
  | "operations";

export const LAUNCH_MODULE_CATEGORY_LABELS: Record<LaunchModuleCategoryId, string> = {
  "client-experience": "Client Experience",
  "executive-intelligence": "Executive Intelligence",
  reporting: "Reporting",
  "work-delivery": "Work and Delivery",
  "brand-content": "Brand and Content",
  operations: "Operations",
};

export const LAUNCH_MODULE_LABELS: Record<string, string> = {
  "website-review": "Website Review",
  "executive-performance": "Executive Performance",
  "executive-review": "Executive Review",
  "website-analytics": "Website Analytics",
  "google-ads": "Google Ads",
  seo: "Search / SEO",
  "executive-reporting": "Executive Reporting",
  gbp: "Google Business Profile",
  stripe: "Stripe",
  meta: "Meta",
  clarity: "Microsoft Clarity",
  crm: "CRM",
  "call-tracking": "Call Tracking",
};

export function launchModuleLabel(moduleId: string): string {
  return LAUNCH_MODULE_LABELS[moduleId] ?? moduleId;
}

export function launchModuleCategory(moduleId: LaunchWizardModuleId): LaunchModuleCategoryId {
  if (moduleId === "website-review" || moduleId === "executive-review") {
    return "client-experience";
  }
  if (moduleId === "executive-performance" || moduleId === "executive-reporting") {
    return "executive-intelligence";
  }
  if (
    moduleId === "seo" ||
    moduleId === "website-analytics" ||
    moduleId === "google-ads" ||
    moduleId === "gbp" ||
    moduleId === "clarity" ||
    moduleId === "meta"
  ) {
    return "reporting";
  }
  if (moduleId === "crm" || moduleId === "call-tracking") return "operations";
  if (moduleId === "stripe") return "operations";
  return "work-delivery";
}

export function groupModulesByCategory<T extends { moduleId: LaunchWizardModuleId }>(
  rows: readonly T[],
): Array<{ categoryId: LaunchModuleCategoryId; label: string; rows: T[] }> {
  const order: LaunchModuleCategoryId[] = [
    "client-experience",
    "executive-intelligence",
    "reporting",
    "work-delivery",
    "brand-content",
    "operations",
  ];
  const map = new Map<LaunchModuleCategoryId, T[]>();
  for (const row of rows) {
    const category = launchModuleCategory(row.moduleId);
    const list = map.get(category) ?? [];
    list.push(row);
    map.set(category, list);
  }
  return order
    .filter((id) => (map.get(id)?.length ?? 0) > 0)
    .map((id) => ({
      categoryId: id,
      label: LAUNCH_MODULE_CATEGORY_LABELS[id],
      rows: map.get(id) ?? [],
    }));
}
