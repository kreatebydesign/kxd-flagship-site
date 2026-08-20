/**
 * Pure operator share/delivery rules. No I/O.
 * Preparing a link is not delivery. Copy/Open never rotate.
 */

import { isShareLinkActive } from "./share.ts";
import type { ShareLinkRecord } from "./types.ts";

export const PROPOSAL_DELIVERY_METHODS = [
  "email",
  "text-message",
  "copied-link",
  "other",
] as const;

export type ProposalDeliveryMethod = (typeof PROPOSAL_DELIVERY_METHODS)[number];

export const TERMINAL_PROPOSAL_SHARE_STATUSES = [
  "accepted-contract-pending",
  "approved",
  "declined",
  "rejected",
  "expired",
  "archived",
] as const;

export interface ManualDeliveryRecord {
  method: ProposalDeliveryMethod;
  deliveredAt: string;
  recipient?: string | null;
  note?: string | null;
  recordedAt: string;
  recordedBy?: string | null;
  activityDedupeKey: string;
}

export function isProposalDeliveryMethod(value: unknown): value is ProposalDeliveryMethod {
  return (
    typeof value === "string" &&
    (PROPOSAL_DELIVERY_METHODS as readonly string[]).includes(value)
  );
}

export function isTerminalProposalShareStatus(status: string): boolean {
  return (TERMINAL_PROPOSAL_SHARE_STATUSES as readonly string[]).includes(status);
}

export function canRewriteShareSnapshot(status: string): boolean {
  return status === "draft" || status === "internal-review" || status === "revision-requested";
}

/** Confirm existing approval without rewriting a live snapshot. */
export function canConfirmShareApproval(status: string): boolean {
  return (
    canRewriteShareSnapshot(status) ||
    status === "approved-for-sharing" ||
    status === "sent" ||
    status === "viewed" ||
    status === "questions"
  );
}

export function canPrepareShareLink(status: string): boolean {
  return (
    status === "approved-for-sharing" ||
    status === "sent" ||
    status === "viewed" ||
    status === "questions"
  );
}

export function canReplaceShareLink(status: string): boolean {
  return canPrepareShareLink(status);
}

export function canMarkProposalSent(status: string): boolean {
  return canPrepareShareLink(status);
}

/** Copy / Open / page load / Mark as Sent never rotate. */
export function shareActionRotatesToken(
  action: "approve" | "prepare" | "replace" | "copy" | "open" | "mark-sent" | "view",
): boolean {
  return action === "replace";
}

export function currentActiveShareLink(
  links: ShareLinkRecord[] | unknown,
): ShareLinkRecord | null {
  if (!Array.isArray(links)) return null;
  for (let i = links.length - 1; i >= 0; i--) {
    const link = links[i] as ShareLinkRecord;
    if (isShareLinkActive(link)) return link;
  }
  return null;
}

export function hasActiveShareLink(links: ShareLinkRecord[] | unknown): boolean {
  return Boolean(currentActiveShareLink(links));
}

/** True when a hashed client URL already exists and must not be silently rotated. */
export function hasUnrecoverableShareToken(input: {
  shareLinks?: unknown;
  publicTokenHash?: string | null;
  revoked?: boolean | null;
}): boolean {
  if (hasActiveShareLink(input.shareLinks)) return true;
  if (input.revoked) return false;
  return Boolean(String(input.publicTokenHash ?? "").trim());
}

export function shouldCreateShareToken(input: {
  shareLinks?: unknown;
  publicTokenHash?: string | null;
  revoked?: boolean | null;
}): boolean {
  return !hasUnrecoverableShareToken(input);
}

/**
 * Public view of a prepared-but-not-marked link records timestamps only.
 * `sent` still advances to `viewed`. Never writes sentAt (caller enforces).
 */
export function nextStatusOnPublicView(status: string): string {
  if (status === "sent") return "viewed";
  return status;
}

export function shouldWriteSentAtOnPublicView(): boolean {
  return false;
}

export function nextStatusOnMarkSent(status: string): string {
  if (status === "approved-for-sharing") return "sent";
  return status;
}

export function isAlreadyMarkedSent(input: {
  sentAt?: string | null;
  manualDelivery?: ManualDeliveryRecord | null;
}): boolean {
  if (input.manualDelivery?.recordedAt) return true;
  if (input.sentAt && String(input.sentAt).trim()) return true;
  return false;
}

export function proposalSentActivityDedupeKey(proposalId: number): string {
  return `proposal-manual-delivery:${proposalId}`;
}

export function normalizeManualDelivery(input: {
  method: ProposalDeliveryMethod;
  deliveredAt?: string | null;
  recipient?: string | null;
  note?: string | null;
  recordedBy?: string | null;
  proposalId: number;
  now?: string;
}): ManualDeliveryRecord {
  const now = input.now ?? new Date().toISOString();
  let deliveredAt = now;
  if (input.deliveredAt && String(input.deliveredAt).trim()) {
    const parsed = new Date(String(input.deliveredAt));
    if (!Number.isNaN(parsed.getTime())) deliveredAt = parsed.toISOString();
  }
  const recipient = input.recipient?.trim() || null;
  const note = input.note?.trim() || null;
  return {
    method: input.method,
    deliveredAt,
    recipient,
    note,
    recordedAt: now,
    recordedBy: input.recordedBy ?? null,
    activityDedupeKey: proposalSentActivityDedupeKey(input.proposalId),
  };
}

export type OperatorShareState = {
  status: string;
  shareApprovedAt: string | null;
  shareApprovedBy: string | null;
  hasShareSnapshot: boolean;
  hasActiveShareLink: boolean;
  sentAt: string | null;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  manualDelivery: {
    method: ProposalDeliveryMethod;
    deliveredAt: string;
    recipient?: string | null;
    note?: string | null;
    recordedAt: string;
  } | null;
  liveDealProtected: boolean;
  rawTokenRecoverable: false;
};

export function buildOperatorShareState(input: {
  status: string;
  shareApprovedAt?: string | null;
  shareApprovedBy?: string | null;
  shareSnapshot?: unknown;
  shareLinks?: unknown;
  publicTokenHash?: string | null;
  revoked?: boolean | null;
  sentAt?: string | null;
  firstViewedAt?: string | null;
  lastViewedAt?: string | null;
  manualDelivery?: ManualDeliveryRecord | null;
  liveDealProtected: boolean;
}): OperatorShareState {
  const delivery = input.manualDelivery;
  return {
    status: input.status,
    shareApprovedAt: input.shareApprovedAt ?? null,
    shareApprovedBy: input.shareApprovedBy ?? null,
    hasShareSnapshot: Boolean(input.shareSnapshot && typeof input.shareSnapshot === "object"),
    hasActiveShareLink: hasUnrecoverableShareToken({
      shareLinks: input.shareLinks,
      publicTokenHash: input.publicTokenHash,
      revoked: input.revoked,
    }),
    sentAt: input.sentAt ?? null,
    firstViewedAt: input.firstViewedAt ?? null,
    lastViewedAt: input.lastViewedAt ?? null,
    manualDelivery: delivery
      ? {
          method: delivery.method,
          deliveredAt: delivery.deliveredAt,
          recipient: delivery.recipient ?? null,
          note: delivery.note ?? null,
          recordedAt: delivery.recordedAt,
        }
      : null,
    liveDealProtected: input.liveDealProtected,
    rawTokenRecoverable: false,
  };
}
