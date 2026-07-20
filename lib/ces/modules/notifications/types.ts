/**
 * Phase 35A — Client Notifications Center (CES presentation layer).
 *
 * Source of truth remains the Activity Engine / executive-timeline-events.
 * This module maps client-visible activity into a polished notification feed.
 */

export type ClientNotificationCategory =
  | "website-review"
  | "website-workspace"
  | "reporting"
  | "inventory"
  | "communications"
  | "general";

export type ClientNotificationKind =
  | "website-review.completed"
  | "website-review.assigned"
  | "website-review.commented"
  | "website-review.received"
  | "website-review.in-review"
  | "website-review.revision-in-progress"
  | "website-review.awaiting-your-input"
  | "website-review.closed"
  | "website-workspace.submitted"
  | "website-workspace.approved"
  | "website-workspace.completed"
  | "website-workspace.in-review"
  | "website-workspace.in-progress"
  | "website-workspace.declined"
  | "reporting.published"
  | "reporting.failed"
  | "reporting.resolved"
  | "inventory.published"
  | "inventory.hidden"
  | "inventory.updated"
  | "communication.message"
  | "communication.campaign"
  | "communication.form"
  | "general";

export interface ClientNotificationItem {
  id: string;
  kind: ClientNotificationKind;
  category: ClientNotificationCategory;
  icon: string;
  title: string;
  description: string;
  occurredAt: string;
  read: boolean;
  href: string | null;
  viewLabel: string | null;
}

export interface ClientNotificationCenterData {
  items: ClientNotificationItem[];
  unreadCount: number;
  generatedAt: string;
}

export interface ClientNotificationSummary {
  unreadCount: number;
  generatedAt: string;
}
