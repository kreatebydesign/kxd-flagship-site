import type { ExecutiveProposalStatus } from "./types";

export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  "internal-review": "Internal Review",
  sent: "Sent",
  viewed: "Viewed",
  questions: "Questions",
  "revision-requested": "Revision Requested",
  approved: "Approved",
  declined: "Declined",
  rejected: "Declined",
  expired: "Expired",
  archived: "Archived",
};

export const OPEN_PIPELINE_STATUSES: ExecutiveProposalStatus[] = [
  "draft",
  "internal-review",
  "sent",
  "viewed",
  "questions",
  "revision-requested",
];

export const NEEDS_FOLLOW_UP_STATUSES: ExecutiveProposalStatus[] = [
  "sent",
  "viewed",
  "questions",
  "revision-requested",
];

const STATUS_TO_TIMELINE: Partial<Record<string, string>> = {
  draft: "proposal.created",
  "internal-review": "proposal.internal-review",
  sent: "proposal.sent",
  viewed: "proposal.viewed",
  questions: "proposal.question",
  "revision-requested": "proposal.revised",
  approved: "proposal.approved",
  declined: "proposal.declined",
  rejected: "proposal.declined",
  expired: "proposal.expired",
  archived: "proposal.archived",
};

export function displayProposalStatus(status: string): string {
  return STATUS_LABELS[status] ?? status.replace(/-/g, " ");
}

export function normalizeProposalStatus(status: string): ExecutiveProposalStatus {
  if (status === "rejected") return "declined";
  return status as ExecutiveProposalStatus;
}

export function statusToTimelineEvent(
  status: string,
  operation: "create" | "update",
): string | null {
  if (operation === "create") return "proposal.created";
  return STATUS_TO_TIMELINE[status] ?? null;
}

export function isOpenProposalStatus(status: string): boolean {
  return OPEN_PIPELINE_STATUSES.includes(status as ExecutiveProposalStatus);
}

export function needsProposalFollowUp(status: string): boolean {
  return NEEDS_FOLLOW_UP_STATUSES.includes(status as ExecutiveProposalStatus);
}
