/**
 * Phase 20C — Display helpers for Work Engine + Client Success.
 * Pure functions — safe for client and server.
 */

import type { WorkListItem, WorkStatus } from "./types";

const AGE_RELEVANT_STATUSES: WorkStatus[] = [
  "in-progress",
  "waiting-on-client",
  "waiting-on-kxd",
  "blocked",
  "review",
];

export function formatWorkDue(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return null;
  }
}

/** Prefer display name; fall back to email local-part. */
export function formatWorkAssignee(assignedTo: string | null): string | null {
  if (!assignedTo?.trim()) return null;
  const value = assignedTo.trim();
  if (value.includes("@")) {
    const local = value.split("@")[0] ?? value;
    return local.replace(/[._]/g, " ");
  }
  return value;
}

/**
 * Age / time in current state — uses updatedAt as state-change proxy.
 * Only shown when useful (waiting, blocked, in motion).
 */
export function formatWorkStateAge(item: WorkListItem, now = new Date()): string | null {
  if (!AGE_RELEVANT_STATUSES.includes(item.status)) return null;
  const at = new Date(item.updatedAt);
  if (Number.isNaN(at.getTime())) return null;
  const days = Math.floor((now.getTime() - at.getTime()) / 86_400_000);
  if (days <= 0) return "Updated today";
  if (days === 1) return "1 day in state";
  if (days < 30) return `${days} days in state`;
  const months = Math.floor(days / 30);
  return months === 1 ? "1 month in state" : `${months} months in state`;
}

export function resolveAssigneeLabel(doc: {
  email?: unknown;
  displayName?: unknown;
  name?: unknown;
}): string {
  if (typeof doc.displayName === "string" && doc.displayName.trim()) {
    return doc.displayName.trim();
  }
  if (typeof doc.name === "string" && doc.name.trim()) return doc.name.trim();
  if (typeof doc.email === "string" && doc.email.trim()) return doc.email.trim();
  return "";
}
