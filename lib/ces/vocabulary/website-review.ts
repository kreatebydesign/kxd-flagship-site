/** Client-facing vocabulary — Website Review × internal request statuses (Stage 5 wiring) */

export type WebsiteReviewClientStatus =
  | "review-received"
  | "in-review"
  | "revision-in-progress"
  | "awaiting-your-input"
  | "completed"
  | "closed";

export const WEBSITE_REVIEW_STATUS_LABELS: Record<WebsiteReviewClientStatus, string> = {
  "review-received": "We've received it",
  "in-review": "In review",
  "revision-in-progress": "Revision in progress",
  "awaiting-your-input": "Awaiting your input",
  completed: "Complete",
  closed: "Closed",
};

/** Maps internal client-requests.status → client vocabulary (Stage 5) */
export const REQUEST_STATUS_TO_REVIEW: Record<string, WebsiteReviewClientStatus> = {
  new: "review-received",
  triaged: "in-review",
  approved: "in-review",
  "in-progress": "revision-in-progress",
  "waiting-on-client": "awaiting-your-input",
  complete: "completed",
  declined: "closed",
};

export function reviewStatusLabel(status: WebsiteReviewClientStatus): string {
  return WEBSITE_REVIEW_STATUS_LABELS[status] ?? status;
}

/** Client-visible activity copy — hospitality tone, not ticket language */
export const WEBSITE_REVIEW_ACTIVITY_DETAILS: Partial<
  Record<WebsiteReviewClientStatus, string>
> = {
  "review-received": "We've received your revision and are reviewing it now.",
  "in-review": "We're reviewing your notes now.",
  "revision-in-progress": "We're preparing your updates.",
  "awaiting-your-input": "A quick note from you will help us continue.",
  completed: "This revision is complete.",
  closed: "This revision has been closed.",
};

export function mapRequestStatusToReview(
  status: string | null | undefined,
): WebsiteReviewClientStatus {
  if (!status) return "review-received";
  return REQUEST_STATUS_TO_REVIEW[status] ?? "review-received";
}

export function reviewEventTypeForStatus(status: WebsiteReviewClientStatus): string {
  return `website-review.${status}`;
}
