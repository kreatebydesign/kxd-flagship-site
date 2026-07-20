import type {
  ClientNotificationCategory,
  ClientNotificationKind,
} from "./types";

export interface ClientNotificationKindDefinition {
  kind: ClientNotificationKind;
  category: ClientNotificationCategory;
  icon: string;
  /** Match against activity eventType (exact or prefix). */
  match: (eventType: string) => boolean;
  defaultTitle: string;
  viewLabel: string;
  /** Fallback portal route when activity has no href. */
  fallbackHref?: string;
}

/**
 * Registry of client notification kinds.
 * Adding a new type = one entry here + publishing client-visible activity.
 */
export const CLIENT_NOTIFICATION_KIND_REGISTRY: ClientNotificationKindDefinition[] = [
  {
    kind: "website-review.completed",
    category: "website-review",
    icon: "◇",
    match: (t) => t === "website-review.completed",
    defaultTitle: "Website Review Completed",
    viewLabel: "Website Review",
    fallbackHref: "/portal/website-review",
  },
  {
    kind: "website-review.assigned",
    category: "website-review",
    icon: "◇",
    match: (t) => t === "website-review.assigned" || t === "website-review.in-review",
    defaultTitle: "Website Review In Progress",
    viewLabel: "Website Review",
    fallbackHref: "/portal/website-review",
  },
  {
    kind: "website-review.commented",
    category: "website-review",
    icon: "◇",
    match: (t) =>
      t === "website-review.commented" || t === "website-review.awaiting-your-input",
    defaultTitle: "Website Review Needs Your Input",
    viewLabel: "Website Review",
    fallbackHref: "/portal/website-review",
  },
  {
    kind: "website-review.received",
    category: "website-review",
    icon: "◇",
    match: (t) => t === "website-review.review-received",
    defaultTitle: "Website Review Received",
    viewLabel: "Website Review",
    fallbackHref: "/portal/website-review",
  },
  {
    kind: "website-review.revision-in-progress",
    category: "website-review",
    icon: "◇",
    match: (t) => t === "website-review.revision-in-progress",
    defaultTitle: "Website Revision In Progress",
    viewLabel: "Website Review",
    fallbackHref: "/portal/website-review",
  },
  {
    kind: "website-review.closed",
    category: "website-review",
    icon: "◇",
    match: (t) => t === "website-review.closed",
    defaultTitle: "Website Review Closed",
    viewLabel: "Website Review",
    fallbackHref: "/portal/website-review",
  },
  {
    kind: "website-workspace.submitted",
    category: "website-workspace",
    icon: "▣",
    match: (t) => t === "website-workspace.submitted",
    defaultTitle: "Edit Request Submitted",
    viewLabel: "Website Workspace",
    fallbackHref: "/portal/website-workspace",
  },
  {
    kind: "website-workspace.approved",
    category: "website-workspace",
    icon: "▣",
    match: (t) => t === "website-workspace.approved",
    defaultTitle: "Edit Request Approved",
    viewLabel: "Website Workspace",
    fallbackHref: "/portal/website-workspace",
  },
  {
    kind: "website-workspace.completed",
    category: "website-workspace",
    icon: "▣",
    match: (t) => t === "website-workspace.completed",
    defaultTitle: "Edit Request Completed",
    viewLabel: "Website Workspace",
    fallbackHref: "/portal/website-workspace",
  },
  {
    kind: "website-workspace.in-review",
    category: "website-workspace",
    icon: "▣",
    match: (t) => t === "website-workspace.in-review",
    defaultTitle: "Edit Request In Review",
    viewLabel: "Website Workspace",
    fallbackHref: "/portal/website-workspace",
  },
  {
    kind: "website-workspace.in-progress",
    category: "website-workspace",
    icon: "▣",
    match: (t) => t === "website-workspace.in-progress",
    defaultTitle: "Edit Request In Progress",
    viewLabel: "Website Workspace",
    fallbackHref: "/portal/website-workspace",
  },
  {
    kind: "website-workspace.declined",
    category: "website-workspace",
    icon: "▣",
    match: (t) => t === "website-workspace.declined",
    defaultTitle: "Edit Request Declined",
    viewLabel: "Website Workspace",
    fallbackHref: "/portal/website-workspace",
  },
  {
    kind: "reporting.published",
    category: "reporting",
    icon: "◈",
    match: (t) => t === "reporting.published",
    defaultTitle: "New Monthly Report Available",
    viewLabel: "Monthly Report",
    fallbackHref: "/portal/reports",
  },
  {
    kind: "reporting.failed",
    category: "reporting",
    icon: "◈",
    match: (t) => t === "reporting.failed" || t === "reporting.generation.failed",
    defaultTitle: "Report Generation Issue",
    viewLabel: "Reports",
    fallbackHref: "/portal/reports",
  },
  {
    kind: "reporting.resolved",
    category: "reporting",
    icon: "◈",
    match: (t) => t === "reporting.resolved",
    defaultTitle: "Reporting Issue Resolved",
    viewLabel: "Reports",
    fallbackHref: "/portal/reports",
  },
  {
    kind: "inventory.published",
    category: "inventory",
    icon: "▣",
    match: (t) => t === "inventory.published",
    defaultTitle: "Vehicle Published",
    viewLabel: "Inventory",
    fallbackHref: "/portal/inventory",
  },
  {
    kind: "inventory.hidden",
    category: "inventory",
    icon: "▣",
    match: (t) => t === "inventory.hidden",
    defaultTitle: "Vehicle Hidden",
    viewLabel: "Inventory",
    fallbackHref: "/portal/inventory",
  },
  {
    kind: "inventory.updated",
    category: "inventory",
    icon: "▣",
    match: (t) => t === "inventory.updated" || t === "inventory.update.completed",
    defaultTitle: "Inventory Update Completed",
    viewLabel: "Inventory",
    fallbackHref: "/portal/inventory",
  },
  {
    kind: "communication.message",
    category: "communications",
    icon: "✉",
    match: (t) =>
      t === "communication.message" ||
      t === "communication.email" ||
      t.startsWith("communication.message"),
    defaultTitle: "New Message Received",
    viewLabel: "Communication",
    fallbackHref: "/portal",
  },
  {
    kind: "communication.campaign",
    category: "communications",
    icon: "✉",
    match: (t) => t === "communication.campaign" || t === "communication.campaign.completed",
    defaultTitle: "Campaign Completed",
    viewLabel: "Communication",
    fallbackHref: "/portal",
  },
  {
    kind: "communication.form",
    category: "communications",
    icon: "✉",
    match: (t) =>
      t === "communication.form" || t === "communication.form.attention",
    defaultTitle: "Form Submission Needs Attention",
    viewLabel: "Communication",
    fallbackHref: "/portal",
  },
];

const GENERAL_KIND: ClientNotificationKindDefinition = {
  kind: "general",
  category: "general",
  icon: "○",
  match: () => true,
  defaultTitle: "Update",
  viewLabel: "View",
  fallbackHref: "/portal",
};

export function resolveNotificationKind(
  eventType: string,
): ClientNotificationKindDefinition {
  const normalized = eventType.trim().toLowerCase();
  for (const def of CLIENT_NOTIFICATION_KIND_REGISTRY) {
    if (def.match(normalized)) return def;
  }
  return GENERAL_KIND;
}
