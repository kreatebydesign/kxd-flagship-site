/**
 * Work Health — prepared for future surfacing. Not exposed in client or admin UI yet.
 */

import type { WorkStatus } from "../types";
import type { WorkHealth, WorkIntegrationMetadata } from "./types";

export interface WorkHealthInput {
  status: WorkStatus;
  dueDate?: string | null;
  blockedReason?: string | null;
  metadata?: WorkIntegrationMetadata | null;
}

function isOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  try {
    const due = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due < today;
  } catch {
    return false;
  }
}

/**
 * Derives operational health from status + due date.
 * Health is intentionally separate from status.
 */
export function computeWorkHealth(input: WorkHealthInput): WorkHealth {
  if (input.status === "blocked") return "blocked";
  if (input.status === "waiting-on-client") return "waiting-on-client";
  if (isOverdue(input.dueDate) && input.status !== "completed" && input.status !== "archived") {
    return "overdue";
  }
  if (input.status === "review" || input.status === "planned") {
    return "needs-attention";
  }
  return "on-track";
}

export function computeWorkHealthFromDoc(doc: {
  status?: string;
  dueDate?: string | null;
  blockedReason?: string | null;
  metadata?: unknown;
}): WorkHealth {
  return computeWorkHealth({
    status: (doc.status ?? "new") as WorkStatus,
    dueDate: doc.dueDate ? String(doc.dueDate) : null,
    blockedReason: doc.blockedReason ? String(doc.blockedReason) : null,
    metadata: doc.metadata as WorkIntegrationMetadata | null,
  });
}
