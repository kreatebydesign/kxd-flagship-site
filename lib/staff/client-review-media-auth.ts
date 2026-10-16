import "server-only";

import { NextResponse } from "next/server";
import { staffActorFromUser } from "./actor";
import {
  actorUsesAssignedClientScope,
  listActiveAssignedClientIds,
} from "./client-assignments";
import { isRestrictedStaff } from "./permissions";
import {
  STAFF_REVIEW_MEDIA_NOT_FOUND_BODY,
  validateStaffClientReviewMediaAccess,
} from "./client-review-media-access-validation";
import { loadClientReviewMediaRecord } from "@/lib/website-review-inbox/serve-attachment";

export {
  STAFF_REVIEW_MEDIA_NOT_FOUND_BODY,
  validateStaffClientReviewMediaAccess,
};

function relClientId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = Number((value as { id: unknown }).id);
    return Number.isFinite(id) ? id : null;
  }
  return null;
}

export function staffReviewMediaNotFoundResponse(): NextResponse {
  return NextResponse.json(STAFF_REVIEW_MEDIA_NOT_FOUND_BODY, { status: 404 });
}

/**
 * Restricted staff with assigned-client scope must match media.client.
 * Returns 404 (not 403) when denied or missing.
 */
export async function denyUnlessStaffClientReviewMedia(
  user: object,
  mediaId: number,
): Promise<NextResponse | null> {
  const actor = staffActorFromUser(user);
  if (!actor || !isRestrictedStaff(actor)) return null;
  if (!actorUsesAssignedClientScope(actor)) return null;

  let row: Record<string, unknown>;
  try {
    row = await loadClientReviewMediaRecord(mediaId);
  } catch {
    return staffReviewMediaNotFoundResponse();
  }

  const allowedClientIds = await listActiveAssignedClientIds(actor.userId);
  const ok = validateStaffClientReviewMediaAccess({
    usesAssignmentScope: true,
    allowedClientIds,
    mediaClientId: relClientId(row.client),
  });

  if (!ok) return staffReviewMediaNotFoundResponse();
  return null;
}
