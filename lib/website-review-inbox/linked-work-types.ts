/**
 * Pure helpers for Website Review ↔ linked Work completion.
 * Safe for verify scripts and client components (no server-only).
 */

import { WORK_STATUS_LABELS } from "@/lib/work/constants";
import type { WorkStatus } from "@/lib/work/types";

export type LinkedWorkEligibility =
  | "eligible"
  | "already_complete"
  | "archived"
  | "missing"
  | "unlinked"
  | "protected";

export type LinkedWorkOutcome =
  | "completed"
  | "already_complete"
  | "archived"
  | "missing"
  | "unlinked"
  | "protected"
  | "skipped_by_operator"
  | "failed";

export interface LinkedWorkInspection {
  eligibility: LinkedWorkEligibility;
  workId: number | null;
  workNumber: string | null;
  workStatus: WorkStatus | null;
  workStatusLabel: string | null;
  adminUrl: string | null;
  reason: string | null;
}

export interface LinkedWorkCompletionResult {
  outcome: LinkedWorkOutcome;
  workId: number | null;
  workNumber: string | null;
  workStatus: WorkStatus | null;
  workStatusLabel: string | null;
  adminUrl: string | null;
  reason: string | null;
}

export interface LinkedWorkCounts {
  eligible: number;
  alreadyComplete: number;
  archived: number;
  missing: number;
  unlinked: number;
  protected: number;
  completed: number;
  failed: number;
  skippedByOperator: number;
}

export function emptyLinkedWorkCounts(): LinkedWorkCounts {
  return {
    eligible: 0,
    alreadyComplete: 0,
    archived: 0,
    missing: 0,
    unlinked: 0,
    protected: 0,
    completed: 0,
    failed: 0,
    skippedByOperator: 0,
  };
}

/** Map a Work status to linked-completion eligibility. */
export function classifyWorkStatusForLinkedCompletion(
  status: WorkStatus | string | null | undefined,
): Extract<LinkedWorkEligibility, "eligible" | "already_complete" | "archived"> {
  if (status === "completed") return "already_complete";
  if (status === "archived") return "archived";
  return "eligible";
}

export function workStatusLabel(status: WorkStatus | string | null | undefined): string | null {
  if (!status) return null;
  if (status in WORK_STATUS_LABELS) {
    return WORK_STATUS_LABELS[status as WorkStatus];
  }
  return String(status);
}

export function inspectionFromMissing(): LinkedWorkInspection {
  return {
    eligibility: "missing",
    workId: null,
    workNumber: null,
    workStatus: null,
    workStatusLabel: null,
    adminUrl: null,
    reason: "No linked Work item was found for this review.",
  };
}

export function inspectionFromUnlinked(): LinkedWorkInspection {
  return {
    eligibility: "unlinked",
    workId: null,
    workNumber: null,
    workStatus: null,
    workStatusLabel: null,
    adminUrl: null,
    reason: "This review has no linked Work Engine item.",
  };
}

export function inspectionFromProtected(reason: string): LinkedWorkInspection {
  return {
    eligibility: "protected",
    workId: null,
    workNumber: null,
    workStatus: null,
    workStatusLabel: null,
    adminUrl: null,
    reason,
  };
}

export function inspectionFromWork(input: {
  workId: number;
  workNumber: string | null;
  status: WorkStatus;
  adminUrl: string;
}): LinkedWorkInspection {
  const eligibility = classifyWorkStatusForLinkedCompletion(input.status);
  const label = workStatusLabel(input.status);
  let reason: string | null = null;
  if (eligibility === "already_complete") {
    reason = "Linked Work is already completed.";
  } else if (eligibility === "archived") {
    reason = "Linked Work is archived and will not be changed.";
  }
  return {
    eligibility,
    workId: input.workId,
    workNumber: input.workNumber,
    workStatus: input.status,
    workStatusLabel: label,
    adminUrl: input.adminUrl,
    reason,
  };
}

export function outcomeFromInspection(
  inspection: LinkedWorkInspection,
  opts?: { skippedByOperator?: boolean; failedReason?: string },
): LinkedWorkCompletionResult {
  if (opts?.skippedByOperator) {
    return {
      outcome: "skipped_by_operator",
      workId: inspection.workId,
      workNumber: inspection.workNumber,
      workStatus: inspection.workStatus,
      workStatusLabel: inspection.workStatusLabel,
      adminUrl: inspection.adminUrl,
      reason: "Operator chose not to complete linked Work.",
    };
  }
  if (opts?.failedReason) {
    return {
      outcome: "failed",
      workId: inspection.workId,
      workNumber: inspection.workNumber,
      workStatus: inspection.workStatus,
      workStatusLabel: inspection.workStatusLabel,
      adminUrl: inspection.adminUrl,
      reason: opts.failedReason,
    };
  }
  if (inspection.eligibility === "eligible") {
    return {
      outcome: "completed",
      workId: inspection.workId,
      workNumber: inspection.workNumber,
      workStatus: "completed",
      workStatusLabel: WORK_STATUS_LABELS.completed,
      adminUrl: inspection.adminUrl,
      reason: null,
    };
  }
  return {
    outcome: inspection.eligibility,
    workId: inspection.workId,
    workNumber: inspection.workNumber,
    workStatus: inspection.workStatus,
    workStatusLabel: inspection.workStatusLabel,
    adminUrl: inspection.adminUrl,
    reason: inspection.reason,
  };
}

export function tallyLinkedWorkInspections(
  inspections: ReadonlyArray<Pick<LinkedWorkInspection, "eligibility">>,
): LinkedWorkCounts {
  const counts = emptyLinkedWorkCounts();
  for (const row of inspections) {
    switch (row.eligibility) {
      case "eligible":
        counts.eligible += 1;
        break;
      case "already_complete":
        counts.alreadyComplete += 1;
        break;
      case "archived":
        counts.archived += 1;
        break;
      case "missing":
        counts.missing += 1;
        break;
      case "unlinked":
        counts.unlinked += 1;
        break;
      case "protected":
        counts.protected += 1;
        break;
      default:
        break;
    }
  }
  return counts;
}

export function tallyLinkedWorkOutcomes(
  outcomes: ReadonlyArray<Pick<LinkedWorkCompletionResult, "outcome">>,
): LinkedWorkCounts {
  const counts = emptyLinkedWorkCounts();
  for (const row of outcomes) {
    switch (row.outcome) {
      case "completed":
        counts.completed += 1;
        break;
      case "already_complete":
        counts.alreadyComplete += 1;
        break;
      case "archived":
        counts.archived += 1;
        break;
      case "missing":
        counts.missing += 1;
        break;
      case "unlinked":
        counts.unlinked += 1;
        break;
      case "protected":
        counts.protected += 1;
        break;
      case "skipped_by_operator":
        counts.skippedByOperator += 1;
        break;
      case "failed":
        counts.failed += 1;
        break;
      default:
        break;
    }
  }
  return counts;
}

/** Operator-facing preview sentence for bulk/reconcile dialogs. */
export function formatLinkedWorkPreviewLine(counts: LinkedWorkCounts): string {
  const parts: string[] = [];
  if (counts.eligible === 1) {
    parts.push("1 eligible linked Work item can also be completed.");
  } else if (counts.eligible > 1) {
    parts.push(`${counts.eligible} eligible linked Work items can also be completed.`);
  } else {
    parts.push("No eligible linked Work items will be completed.");
  }

  const skips: string[] = [];
  if (counts.alreadyComplete === 1) skips.push("1 is already complete");
  else if (counts.alreadyComplete > 1) {
    skips.push(`${counts.alreadyComplete} are already complete`);
  }
  if (counts.unlinked + counts.missing === 1) skips.push("1 has no linked Work");
  else if (counts.unlinked + counts.missing > 1) {
    skips.push(`${counts.unlinked + counts.missing} have no linked Work`);
  }
  if (counts.archived === 1) skips.push("1 is archived");
  else if (counts.archived > 1) skips.push(`${counts.archived} are archived`);
  if (counts.protected === 1) skips.push("1 is protected/unavailable");
  else if (counts.protected > 1) {
    skips.push(`${counts.protected} are protected/unavailable`);
  }

  if (skips.length > 0) {
    parts.push(skips.join("; ") + ".");
  }

  return parts.join(" ");
}

export function formatLinkedWorkResultLine(counts: LinkedWorkCounts): string {
  const parts: string[] = [];
  if (counts.completed === 1) parts.push("1 linked Work completed");
  else if (counts.completed > 1) parts.push(`${counts.completed} linked Work completed`);

  if (counts.alreadyComplete === 1) parts.push("1 already complete");
  else if (counts.alreadyComplete > 1) {
    parts.push(`${counts.alreadyComplete} already complete`);
  }

  if (counts.unlinked + counts.missing === 1) parts.push("1 unlinked/missing");
  else if (counts.unlinked + counts.missing > 1) {
    parts.push(`${counts.unlinked + counts.missing} unlinked/missing`);
  }

  if (counts.protected + counts.archived === 1) parts.push("1 unavailable/protected");
  else if (counts.protected + counts.archived > 1) {
    parts.push(`${counts.protected + counts.archived} unavailable/protected`);
  }

  if (counts.skippedByOperator === 1) parts.push("1 skipped by choice");
  else if (counts.skippedByOperator > 1) {
    parts.push(`${counts.skippedByOperator} skipped by choice`);
  }

  if (counts.failed === 1) parts.push("1 Work completion failed");
  else if (counts.failed > 1) parts.push(`${counts.failed} Work completions failed`);

  return parts.length > 0 ? parts.join(". ") + "." : "No linked Work changes.";
}

export function defaultCompleteLinkedWork(inspection: LinkedWorkInspection | null): boolean {
  return inspection?.eligibility === "eligible";
}
