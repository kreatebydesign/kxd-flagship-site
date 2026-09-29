/**
 * Membership-scoped operator preview account switch.
 * Updates only the preview cookie — never mutates portal-user lastActive.
 */
import "server-only";

import {
  dedupeActiveMembershipsByClient,
  isClientInActiveMemberships,
  listPortalMembershipsForUser,
} from "@/lib/portal/memberships";
import {
  buildOperatorPortalPreviewSession,
  getOperatorPortalPreviewCookieSession,
  setOperatorPortalPreviewCookie,
  type OperatorPortalPreviewSession,
} from "@/lib/portal/operator-preview";

export async function switchOperatorPortalPreviewClient(input: {
  adminUserId: number;
  targetClientId: number;
}): Promise<{
  clientId: number;
  clientName: string;
  clientSlug: string | null;
  preview: OperatorPortalPreviewSession;
}> {
  const prior = await getOperatorPortalPreviewCookieSession();
  if (!prior) {
    throw new Error("OPERATOR_PREVIEW_REQUIRED");
  }
  if (prior.adminUserId !== input.adminUserId) {
    throw new Error("OPERATOR_PREVIEW_OPERATOR_MISMATCH");
  }
  const asPortalUserId = prior.asPortalUserId;
  if (!asPortalUserId || asPortalUserId <= 0) {
    throw new Error("OPERATOR_PREVIEW_SWITCH_UNAVAILABLE");
  }
  if (!Number.isFinite(input.targetClientId) || input.targetClientId <= 0) {
    throw new Error("OPERATOR_PREVIEW_SWITCH_DENIED");
  }

  const memberships = await listPortalMembershipsForUser(asPortalUserId);
  const active = dedupeActiveMembershipsByClient(
    memberships.filter((m) => m.status === "active"),
  );
  if (!isClientInActiveMemberships(active, input.targetClientId)) {
    throw new Error("OPERATOR_PREVIEW_SWITCH_DENIED");
  }

  const match = active.find((m) => m.clientId === input.targetClientId)!;
  const preview = buildOperatorPortalPreviewSession({
    adminUserId: prior.adminUserId,
    adminEmail: prior.adminEmail,
    clientId: match.clientId,
    clientName: match.clientName,
    clientSlug: match.clientSlug,
    mode: prior.mode === "staff-test" ? "staff-test" : "preview",
    asPortalUserId,
    asPortalUserDisplayName: prior.asPortalUserDisplayName,
    draftComposition: prior.draftComposition,
  });

  await setOperatorPortalPreviewCookie(preview);

  return {
    clientId: match.clientId,
    clientName: match.clientName,
    clientSlug: match.clientSlug,
    preview,
  };
}
