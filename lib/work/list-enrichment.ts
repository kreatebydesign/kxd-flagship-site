/**
 * Operator + staff list enrichment from Work docs (metadata, assignment signals).
 * No server-only — safe for verify scripts.
 */

import { requiresMattApproval } from "@/lib/staff/prioritize";
import { readRawWorkMetadata } from "@/lib/staff/work-guided-metadata";
import {
  mergeDeliverableViews,
  parseDeliverableProgress,
  parseDeliverablesDefinition,
  summarizeDeliverableProgress,
  type StaffDeliverableProgressSummary,
} from "@/lib/staff/work-deliverables";
import type { WorkListItem } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export function deliverableSummaryFromWorkDoc(
  doc: AnyDoc,
  assigneeUserId: number | null,
): StaffDeliverableProgressSummary | null {
  const metadata = readRawWorkMetadata(doc);
  const definition = parseDeliverablesDefinition(metadata);
  if (!definition?.items.length) return null;
  const progress =
    assigneeUserId != null ? parseDeliverableProgress(metadata, assigneeUserId) : null;
  const views = mergeDeliverableViews(definition, progress);
  return summarizeDeliverableProgress(views);
}

export function enrichWorkListItemFromDoc(
  item: WorkListItem,
  doc: AnyDoc,
  options?: { restrictedStaffUserIds?: ReadonlySet<number> },
): WorkListItem {
  const deliverableProgress = deliverableSummaryFromWorkDoc(doc, item.assignedToId);
  const hasStaffAssignment =
    item.assignedToId != null &&
    Boolean(
      options?.restrictedStaffUserIds?.has(item.assignedToId),
    );
  const requiresOperatorApproval = requiresMattApproval(item);

  return {
    ...item,
    ...(deliverableProgress ? { deliverableProgress } : {}),
    hasStaffAssignment,
    requiresOperatorApproval,
  };
}

export function isWorkSubmittedForReview(work: Pick<WorkListItem, "status">): boolean {
  return work.status === "review";
}
