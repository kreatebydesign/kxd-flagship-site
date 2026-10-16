/** Same body as missing media — avoid leaking existence vs authorization. */
export const STAFF_REVIEW_MEDIA_NOT_FOUND_BODY = {
  ok: false,
  message: "Not found.",
} as const;

/**
 * Assignment-scoped staff may only open review media for assigned clients.
 * Coordinators and operators bypass (usesAssignmentScope: false).
 */
export function validateStaffClientReviewMediaAccess(input: {
  usesAssignmentScope: boolean;
  allowedClientIds: number[];
  mediaClientId: number | null | undefined;
}): boolean {
  if (!input.usesAssignmentScope) return true;
  const clientId = input.mediaClientId;
  if (clientId == null || !Number.isFinite(clientId) || clientId <= 0) {
    return false;
  }
  return input.allowedClientIds.includes(clientId);
}
