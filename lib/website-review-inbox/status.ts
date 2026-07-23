import type { ReviewInboxRequestStatus, ReviewInboxStatusOption } from "./types";

/** Operator-facing labels mapped to existing client-requests statuses */
export const REVIEW_INBOX_STATUS_OPTIONS: ReviewInboxStatusOption[] = [
  { value: "new", label: "New", variant: "status" },
  { value: "triaged", label: "In review", variant: "status" },
  { value: "approved", label: "Approved", variant: "pending" },
  { value: "waiting-on-client", label: "Waiting on client", variant: "pending" },
  { value: "in-progress", label: "In progress", variant: "warning" },
  { value: "complete", label: "Completed", variant: "success" },
  { value: "declined", label: "Declined", variant: "default" },
];

const STATUS_SET = new Set<string>(REVIEW_INBOX_STATUS_OPTIONS.map((o) => o.value));

export function isReviewInboxStatus(value: string): value is ReviewInboxRequestStatus {
  return STATUS_SET.has(value);
}

export function reviewInboxStatusOption(
  status: string | null | undefined,
): ReviewInboxStatusOption {
  const match = REVIEW_INBOX_STATUS_OPTIONS.find((o) => o.value === status);
  return match ?? { value: "new", label: status ?? "Unknown", variant: "default" };
}

export const REVIEW_INBOX_OPEN_STATUSES: ReviewInboxRequestStatus[] = [
  "new",
  "triaged",
  "approved",
  "waiting-on-client",
  "in-progress",
];

/**
 * Statuses eligible for operator bulk completion.
 *
 * Stored `"in-progress"` is the only match for operator “In progress” and
 * client “Revision in progress”. There is no distinct “In Revision” enum value.
 */
export const REVIEW_INBOX_BULK_COMPLETE_ELIGIBLE_STATUSES: ReviewInboxRequestStatus[] = [
  "in-progress",
];

export function isReviewInboxBulkCompleteEligible(
  status: string | null | undefined,
): boolean {
  return REVIEW_INBOX_BULK_COMPLETE_ELIGIBLE_STATUSES.includes(
    status as ReviewInboxRequestStatus,
  );
}
