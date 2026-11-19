import type {
  OperationsNavGroup,
  OperationsNavId,
} from "@/components/admin/operations/shared/operations-nav";
import { getEditionOperationsNavGroups } from "@/lib/editions/navigation";

export type FounderPrimaryNavItem = {
  id: OperationsNavId;
  label: string;
  href: string;
  /** Additional nav ids that should highlight this item. */
  alsoActiveFor?: OperationsNavId[];
};

/** Approved top-level founder navigation (routes unchanged). */
export const FOUNDER_PRIMARY_NAV: FounderPrimaryNavItem[] = [
  { id: "today", label: "Today", href: "/admin/operations/today" },
  { id: "work", label: "Work", href: "/admin/work", alsoActiveFor: ["review-inbox", "upgrade-requests"] },
  {
    id: "clients",
    label: "Clients",
    href: "/admin/operations/clients",
    alsoActiveFor: ["genesis", "events", "client-launch-wizard", "onboarding", "portal-access", "client-success"],
  },
  {
    id: "sales-pipeline",
    label: "Sales",
    href: "/admin/sales",
    alsoActiveFor: [
      "sales-leads",
      "sales-proposals",
      "sales-templates",
      "sales-activities",
      "sales-forecast",
      "opportunities",
      "growth",
    ],
  },
  {
    id: "accounts",
    label: "Finance",
    href: "/admin/operations/accounts",
    alsoActiveFor: ["money-moves", "commercial-agreements", "reports", "reporting-ops"],
  },
  {
    id: "staff",
    label: "Team",
    href: "/admin/operations/staff",
    alsoActiveFor: ["training", "staff-documents", "staff-time", "staff-my-work"],
  },
  {
    id: "intelligence",
    label: "Insights",
    href: "/admin/operations/intelligence",
    alsoActiveFor: ["brain", "founder-intelligence", "executive", "timeline", "strategy"],
  },
];

export const FOUNDER_SETTINGS_HREFS = [
  { label: "Settings", href: "/admin/operations/settings", id: "settings" as const },
  { label: "Platform", href: "/admin/operations/platform", id: "platform" as const },
];

const PRIMARY_IDS = new Set(
  FOUNDER_PRIMARY_NAV.flatMap((item) => [item.id, ...(item.alsoActiveFor ?? [])]),
);

/** Edition-filtered legacy groups, minus items surfaced in the primary rail. */
export function getFounderAdvancedNavGroups(): OperationsNavGroup[] {
  return getEditionOperationsNavGroups()
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !PRIMARY_IDS.has(item.id)),
    }))
    .filter((group) => group.items.length > 0);
}

export function isFounderPrimaryNavActive(
  activeId: OperationsNavId,
  item: FounderPrimaryNavItem,
): boolean {
  if (item.id === activeId) return true;
  return item.alsoActiveFor?.includes(activeId) ?? false;
}