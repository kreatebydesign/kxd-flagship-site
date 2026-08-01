/**
 * Pure related-project ownership check for portal request creation.
 */

export type PortalRelatedProjectAccessDecision =
  | { ok: true }
  | { ok: false; reason: "cross-client" | "missing" };

/**
 * Decide whether a relatedProject id may be attached to a portal request.
 * Missing and cross-client projects both fail closed.
 */
export function decidePortalRelatedProjectAccess(input: {
  projectClientId: number | null | undefined;
  authorizedClientId: number;
}): PortalRelatedProjectAccessDecision {
  if (!Number.isFinite(input.authorizedClientId) || input.authorizedClientId <= 0) {
    return { ok: false, reason: "missing" };
  }
  if (
    input.projectClientId == null ||
    !Number.isFinite(input.projectClientId) ||
    input.projectClientId <= 0
  ) {
    return { ok: false, reason: "missing" };
  }
  if (input.projectClientId !== input.authorizedClientId) {
    return { ok: false, reason: "cross-client" };
  }
  return { ok: true };
}
