import "server-only";

import { getPayload } from "payload";
import config from "@payload-config";
import { deleteClientReviewMediaObject } from "@/lib/client-review-media/delete-object";
import { WEBSITE_REVIEW_EXPERIENCE_MODULE } from "@/lib/ces/modules/website-review/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDoc = Record<string, any>;

export interface DeleteWebsiteReviewResult {
  ok: true;
  requestId: number;
  deletedAttachments: number;
  deletedEvents: number;
}

/**
 * Permanently removes a Website Review revision and its scoped artifacts.
 * Admin-only — caller must verify auth before invoking.
 */
export async function deleteWebsiteReviewRevision(
  requestId: number,
): Promise<DeleteWebsiteReviewResult> {
  const payload = await getPayload({ config });

  let existing: AnyDoc;
  try {
    existing = (await payload.findByID({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-requests" as any,
      id: requestId,
      depth: 0,
      overrideAccess: true,
    })) as AnyDoc;
  } catch {
    throw new Error("Revision not found.");
  }

  if (
    existing.experienceModule !== WEBSITE_REVIEW_EXPERIENCE_MODULE &&
    existing.experienceModule !== "website-workspace"
  ) {
    throw new Error("Only website collaboration requests can be deleted from Review Inbox.");
  }

  const attachments = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-review-media" as any,
    where: { relatedRequest: { equals: requestId } },
    limit: 100,
    depth: 0,
    overrideAccess: true,
  });

  for (const doc of attachments.docs) {
    await deleteClientReviewMediaObject(doc as AnyDoc);
    await payload.delete({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "client-review-media" as any,
      id: (doc as AnyDoc).id,
      overrideAccess: true,
    });
  }

  const events = await payload.find({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "executive-timeline-events" as any,
    where: { request: { equals: requestId } },
    limit: 200,
    depth: 0,
    overrideAccess: true,
  });

  for (const doc of events.docs) {
    await payload.delete({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      collection: "executive-timeline-events" as any,
      id: (doc as AnyDoc).id,
      overrideAccess: true,
    });
  }

  await payload.delete({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    collection: "client-requests" as any,
    id: requestId,
    overrideAccess: true,
  });

  return {
    ok: true,
    requestId,
    deletedAttachments: attachments.totalDocs,
    deletedEvents: events.totalDocs,
  };
}
