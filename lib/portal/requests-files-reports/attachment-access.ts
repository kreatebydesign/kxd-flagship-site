/**
 * Pure portal attachment ownership checks — no database.
 */

import type { PortalAttachmentAccessDecision } from "./types";

/**
 * Decide whether a stored review/workspace attachment may be served for the
 * authorized active client. Cross-client IDs fail closed without revealing
 * sibling records.
 */
export function decidePortalAttachmentAccess(input: {
  mediaClientId: number | null | undefined;
  authorizedClientId: number;
}): PortalAttachmentAccessDecision {
  if (!Number.isFinite(input.authorizedClientId) || input.authorizedClientId <= 0) {
    return { ok: false, reason: "missing" };
  }
  if (
    input.mediaClientId == null ||
    !Number.isFinite(input.mediaClientId) ||
    input.mediaClientId <= 0
  ) {
    return { ok: false, reason: "missing" };
  }
  if (input.mediaClientId !== input.authorizedClientId) {
    return { ok: false, reason: "cross-client" };
  }
  return { ok: true };
}

/** Uniform denial for portal UI/API — never distinguish cross-client from missing. */
export function portalAttachmentAccessDenied(
  decision: PortalAttachmentAccessDecision,
): boolean {
  return !decision.ok;
}
